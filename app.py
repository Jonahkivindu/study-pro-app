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
    # Clean text for PDF encoding (handles Swahili/English characters)
    clean_text = text.encode('latin-1', 'replace').decode('latin-1')
    pdf.multi_cell(0, 10, txt=clean_text)
    return pdf.output(dest='S').encode('latin-1')

# --- CONFIG & DB SETUP ---
st.set_page_config(page_title="Class Master Pro", layout="wide", page_icon="🎓")
if not os.path.exists("recordings"): 
    os.makedirs("recordings")

@st.cache_resource
def load_model():
    # 'base' model is the best balance of speed and accuracy for Kiswahili/English
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
    st.info("System: Local AI Engine Active")

# --- 1. START RECORDING PAGE ---
if selection == "🎙️ Start Recording":
    st.header("New Class Recording")
    name_input = st.text_input("Enter Class Name", "New Lecture")
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

# --- 2. SAVED & NOTES PAGE (MAIN LIBRARY) ---
elif selection == "📚 Saved & Notes":
    st.header("Your Library")
    search = st.text_input("🔍 Search by name...", "")
    
    # FIXED SQL QUERY
    rows = c.execute("SELECT * FROM records WHERE class_name LIKE ? ORDER BY id DESC", ('%' + search + '%',)).fetchall()
    
    if not rows:
        st.info("Your library is empty. Start by recording or uploading a file!")

    for row in rows:
        rid, rtype, rname, rpath, rtrans, rsum, rdate = row
        
        with st.expander(f"📁 {rname.upper()} | {rdate[:16]}"):
            if rpath != "N/A" and os.path.exists(rpath):
                st.audio(rpath)
            
            col_a, col_b, col_c = st.columns(3)
            
            # --- TRANSCRIBE ACTION ---
            if col_a.button(f"📝 Transcribe", key=f"t_btn_{rid}"):
                with st.spinner("AI is listening to the lecture..."):
                    segments, _ = model.transcribe(rpath)
                    full_text = " ".join([s.text for s in segments])
                    c.execute("UPDATE records SET transcript=? WHERE id=?", (full_text, rid))
                    conn.commit()
                    st.rerun()

            # --- SMART SUMMARIZE ACTION (NEW LOGIC) ---
            if col_b.button(f"✨ Summarize", key=f"s_btn_{rid}"):
                if rtrans:
                    with st.spinner("Extracting Names & Keywords..."):
                        # Extracting potential names/topics (Words starting with Capitals)
                        words = rtrans.split()
                        potential_entities = []
                        for w in words:
                            cleaned = w.strip(".,!?:()\"")
                            if len(cleaned) > 3 and cleaned[0].isupper() and cleaned not in potential_entities:
                                potential_entities.append(cleaned)
                        
                        # Extracting main teaching points (Sentences over 45 chars)
                        sentences = [s.strip() for s in rtrans.split(". ") if len(s) > 45]
                        
                        # Formatting the Smart Summary
                        smart_notes = f"### 💡 KEY NAMES & TOPICS:\n"
                        smart_notes += ", ".join(potential_entities[:15]) if potential_entities else "No specific names found."
                        smart_notes += "\n\n### 📝 CORE STUDY POINTS:\n"
                        smart_notes += "\n".join([f"• {s}" for s in sentences[:10]])
                        
                        c.execute("UPDATE records SET summary=? WHERE id=?", (smart_notes, rid))
                        conn.commit()
                        st.rerun()
                else:
                    st.error("Please transcribe the audio first!")

            # --- DELETE ACTION ---
            if col_c.button(f"🗑️ Delete", key=f"d_btn_{rid}"):
                if rpath != "N/A" and os.path.exists(rpath): os.remove(rpath)
                c.execute("DELETE FROM records WHERE id=?", (rid,))
                conn.commit()
                st.rerun()

            # --- DISPLAY & DOWNLOAD TABS ---
            tab_t, tab_s = st.tabs(["📜 Full Transcript", "💡 Smart Summary"])
            
            with tab_t:
                if rtrans:
                    st.text_area("Full Transcript", rtrans, height=200, key=f"ta_view_{rid}")
                    pdf_t = create_pdf(f"Transcript: {rname}", rtrans)
                    st.download_button("📥 Download Transcript (PDF)", pdf_t, f"{rname}_T.pdf", "application/pdf", key=f"dl_t_{rid}")
                else:
                    st.info("No transcript found. Click 'Transcribe'.")

            with tab_s:
                if rsum:
                    st.markdown(rsum)
                    pdf_s = create_pdf(f"Summary: {rname}", rsum)
                    st.download_button("📥 Download Summary (PDF)", pdf_s, f"{rname}_Summary.pdf", "application/pdf", key=f"dl_s_{rid}")
                else:
                    st.info("No summary found. Click 'Summarize'.")

# --- 3. UPLOAD AUDIO PAGE ---
elif selection == "📤 Upload Audio":
    st.header("Upload Audio File")
    up_name = st.text_input("Recording Name", "Seminar Recording")
    up_file = st.file_uploader("Select MP3 or WAV", type=['mp3', 'wav'])
    
    if up_file and st.button("Add to My Library"):
        save_path = os.path.join("recordings", up_file.name)
        with open(save_path, "wb") as f: 
            f.write(up_file.read())
        c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                  ("Upload", up_name, save_path, "", "", str(datetime.now())))
        conn.commit()
        st.success("✅ File uploaded successfully!")

# --- 4. UPLOAD PDF PAGE ---
elif selection == "📄 Upload PDF":
    st.header("Summarize PDF Document")
    pdf_file = st.file_uploader("Upload Class Notes (PDF)", type=['pdf'])
    
    if pdf_file and st.button("Generate Summary from PDF"):
        with st.spinner("Analyzing document..."):
            reader = PdfReader(pdf_file)
            full_pdf_text = "".join([p.extract_text() for p in reader.pages])
            
            # Simple keyword/sentence logic for PDF
            pdf_sentences = [s.strip() for s in full_pdf_text.split(". ") if len(s) > 50]
            pdf_summary = f"### 📄 PDF SUMMARY: {pdf_file.name}\n\n" + "\n".join([f"• {s}" for s in pdf_sentences[:15]])
            
            c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                      ("PDF", pdf_file.name, "N/A", full_pdf_text, pdf_summary, str(datetime.now())))
            conn.commit()
            st.success("✅ PDF Analysis complete!")
