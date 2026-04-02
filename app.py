import streamlit as st
from streamlit_mic_recorder import mic_recorder
from faster_whisper import WhisperModel
import os
import sqlite3
from datetime import datetime
from PyPDF2 import PdfReader
from fpdf import FPDF

# --- 1. PDF GENERATOR HELPER ---
def create_pdf(title, text):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt=title, ln=1, align='C')
    pdf.ln(10)
    pdf.set_font("Arial", size=12)
    # Clean text for PDF encoding (handles Swahili/English chars)
    clean_text = text.encode('latin-1', 'replace').decode('latin-1')
    pdf.multi_cell(0, 10, txt=clean_text)
    return pdf.output(dest='S').encode('latin-1')

# --- CONFIG & DB SETUP ---
st.set_page_config(page_title="Class Master Pro", layout="wide", page_icon="🎓")
if not os.path.exists("recordings"): 
    os.makedirs("recordings")

@st.cache_resource
def load_model():
    return WhisperModel("base", device="cpu", compute_type="int8")

model = load_model()

# Database Connection
conn = sqlite3.connect('class_pro_v6.db', check_same_thread=False)
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS records 
             (id INTEGER PRIMARY KEY, type TEXT, class_name TEXT, file_path TEXT, 
              transcript TEXT, summary TEXT, date TEXT)''')
conn.commit()

# --- SIDEBAR NAVIGATION ---
with st.sidebar:
    st.title("🎓 Study Pro")
    st.markdown("---")
    selection = st.radio("GO TO:", ["🎙️ Start Recording", "📚 Saved & Notes", "📤 Upload Audio", "📄 Upload PDF"])
    st.markdown("---")
    st.info("System: Local AI Active")

# --- 1. START RECORDING PAGE ---
if selection == "🎙️ Start Recording":
    st.header("New Class Recording")
    name_input = st.text_input("Enter Class Name", "Economics Lecture")
    st.write("---")
    audio_record = mic_recorder(start_prompt="🔴 Start Recording", stop_prompt="⏹️ Stop and Save", key='main_recorder')

    if audio_record:
        timestamp = datetime.now().strftime('%H%M%S')
        file_name = f"{name_input.replace(' ', '_')}_{timestamp}.mp3"
        save_path = os.path.join("recordings", file_name)
        with open(save_path, "wb") as f:
            f.write(audio_record['bytes'])
        
        c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                  ("Live", name_input, save_path, "", "", str(datetime.now())))
        conn.commit()
        st.success(f"✅ Saved! Go to 'Saved & Notes' to process.")

# --- 2. SAVED & NOTES PAGE (FIXED SQL ERROR HERE) ---
elif selection == "📚 Saved & Notes":
    st.header("Your Library")
    search = st.text_input("🔍 Search by name...", "")
    # FIXED: Changed 'BY' to 'FROM' and ensured proper SQL syntax
    rows = c.execute("SELECT * FROM records WHERE class_name LIKE ? ORDER BY id DESC", ('%' + search + '%',)).fetchall()
    
    if not rows:
        st.info("Your library is empty. Start by recording or uploading a file!")

    for row in rows:
        rid, rtype, rname, rpath, rtrans, rsum, rdate = row
        
        with st.expander(f"📁 {rname.upper()} | {rdate[:16]}"):
            if rpath != "N/A" and os.path.exists(rpath):
                st.audio(rpath)
            
            col_a, col_b, col_c = st.columns(3)
            
            if col_a.button(f"📝 Transcribe", key=f"t_btn_{rid}"):
                with st.spinner("AI is listening..."):
                    segments, _ = model.transcribe(rpath)
                    full_text = " ".join([s.text for s in segments])
                    c.execute("UPDATE records SET transcript=? WHERE id=?", (full_text, rid))
                    conn.commit()
                    st.rerun()

            if col_b.button(f"✨ Summarize", key=f"s_btn_{rid}"):
                if rtrans:
                    with st.spinner("Creating Smart Notes..."):
                        sentences = [s.strip() for s in rtrans.split(". ") if len(s) > 40]
                        smart_notes = f"KEY TAKEAWAYS FOR {rname}:\n\n" + "\n".join([f"• {s}" for s in sentences[:15]])
                        c.execute("UPDATE records SET summary=? WHERE id=?", (smart_notes, rid))
                        conn.commit()
                        st.rerun()
                else:
                    st.error("Please transcribe the audio first!")

            if col_c.button(f"🗑️ Delete", key=f"d_btn_{rid}"):
                if rpath != "N/A" and os.path.exists(rpath): os.remove(rpath)
                c.execute("DELETE FROM records WHERE id=?", (rid,))
                conn.commit()
                st.rerun()

            tab_t, tab_s = st.tabs(["📜 Full Transcript", "💡 Smart Summary"])
            
            with tab_t:
                if rtrans:
                    st.text_area("Transcript Text", rtrans, height=200, key=f"ta_view_{rid}")
                    pdf_t_data = create_pdf(f"Transcript: {rname}", rtrans)
                    st.download_button("📥 Download PDF", pdf_t_data, f"{rname}_T.pdf", "application/pdf", key=f"dl_t_{rid}")
                else:
                    st.info("Click 'Transcribe' to generate text.")

            with tab_s:
                if rsum:
                    st.markdown(rsum)
                    pdf_s_data = create_pdf(f"Summary: {rname}", rsum)
                    st.download_button("📥 Download PDF", pdf_s_data, f"{rname}_S.pdf", "application/pdf", key=f"dl_s_{rid}")
                else:
                    st.info("Click 'Summarize' to generate notes.")

# --- 3. UPLOAD AUDIO PAGE (RESTORED) ---
elif selection == "📤 Upload Audio":
    st.header("Upload Audio File")
    up_name = st.text_input("Name this file", "Seminar Audio")
    up_file = st.file_uploader("Choose MP3/WAV", type=['mp3', 'wav'])
    
    if up_file:
        if st.button("Add to Library"):
            save_path = os.path.join("recordings", up_file.name)
            with open(save_path, "wb") as f: 
                f.write(up_file.read())
            c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                      ("Upload", up_name, save_path, "", "", str(datetime.now())))
            conn.commit()
            st.success("✅ File added!")

# --- 4. UPLOAD PDF PAGE (RESTORED) ---
elif selection == "📄 Upload PDF":
    st.header("Summarize PDF Document")
    pdf_file = st.file_uploader("Upload Class PDF", type=['pdf'])
    
    if pdf_file:
        if st.button("Generate PDF Summary"):
            with st.spinner("Processing..."):
                reader = PdfReader(pdf_file)
                full_pdf_text = "".join([p.extract_text() for p in reader.pages])
                pdf_sentences = [s.strip() for s in full_pdf_text.split(". ") if len(s) > 40]
                pdf_summary = f"### 📄 PDF SUMMARY: {pdf_file.name}\n\n" + "\n".join([f"• {s}" for s in pdf_sentences[:15]])
                c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                          ("PDF", pdf_file.name, "N/A", full_pdf_text, pdf_summary, str(datetime.now())))
                conn.commit()
                st.success("✅ PDF Summarized!")
