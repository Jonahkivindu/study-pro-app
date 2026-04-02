import streamlit as st
from streamlit_mic_recorder import mic_recorder
from faster_whisper import WhisperModel
import os
import sqlite3
from datetime import datetime
from PyPDF2 import PdfReader
from fpdf import FPDF

# --- 1. PDF GENERATOR FUNCTION ---
def create_pdf(title, text):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt=title, ln=1, align='C')
    pdf.set_font("Arial", size=12)
    pdf.ln(10)
    # Clean text for PDF encoding to avoid errors with special characters
    clean_text = text.encode('latin-1', 'replace').decode('latin-1')
    pdf.multi_cell(0, 10, txt=clean_text)
    return pdf.output(dest='S').encode('latin-1')

# --- CONFIG & DIRECTORIES ---
st.set_page_config(page_title="Class Master Pro", layout="wide", page_icon="🎓")
if not os.path.exists("recordings"):
    os.makedirs("recordings")

# --- INITIALIZE LOCAL AI MODEL ---
@st.cache_resource
def load_model():
    return WhisperModel("base", device="cpu", compute_type="int8")

model = load_model()

# --- DATABASE SETUP ---
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
    st.info("System: Local Offline Mode")

# --- 1. START RECORDING PAGE ---
if selection == "🎙️ Start Recording":
    st.header("New Class Recording")
    name_input = st.text_input("Enter Class Name", "Economics Lecture 1")
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
        st.success(f"✅ Saved! Head to 'Saved & Notes' to process.")

# --- 2. SAVED & NOTES PAGE ---
elif selection == "📚 Saved & Notes":
    st.header("Your Library")
    search = st.text_input("🔍 Search by name...", "")
    rows = c.execute("SELECT * FROM records WHERE class_name LIKE ? ORDER BY id DESC", ('%' + search + '%',)).fetchall()
    
    if not rows:
        st.info("Your library is empty.")

    for row in rows:
        # row[0] is the unique ID from the database
        record_id = row[0]
        class_name = row[2]
        
        with st.expander(f"📁 {class_name.upper()} | {row[6][:16]}"):
            if row[3] != "N/A" and os.path.exists(row[3]):
                st.audio(row[3])
            
            col_a, col_b, col_c = st.columns(3)
            
            if col_a.button(f"📝 Transcribe", key=f"btn_trans_{record_id}"):
                with st.spinner("AI is listening..."):
                    segments, _ = model.transcribe(row[3])
                    full_text = " ".join([s.text for s in segments])
                    c.execute("UPDATE records SET transcript=? WHERE id=?", (full_text, record_id))
                    conn.commit()
                    st.rerun()

            if col_b.button(f"✨ Note Points", key=f"btn_sum_{record_id}"):
                if row[4]:
                    with st.spinner("Summarizing..."):
                        points = "\n".join([f"• {s.strip()}" for s in row[4].split(". ")[:25] if len(s) > 10])
                        summary_content = f"NOTES FOR {class_name}:\n\n{points}"
                        c.execute("UPDATE records SET summary=? WHERE id=?", (summary_content, record_id))
                        conn.commit()
                        st.rerun()
                else:
                    st.error("Please transcribe first!")

            if col_c.button(f"🗑️ Delete", key=f"btn_del_{record_id}"):
                if row[3] != "N/A" and os.path.exists(row[3]):
                    os.remove(row[3])
                c.execute("DELETE FROM records WHERE id=?", (record_id,))
                conn.commit()
                st.rerun()

            t_tab, s_tab = st.tabs(["📜 Transcript", "📝 Summary"])
            
            with t_tab:
                if row[4]:
                    st.text_area("Full Transcript", row[4], height=200, key=f"txt_area_t_{record_id}")
                    pdf_t = create_pdf(f"Transcript: {class_name}", row[4])
                    # KEY ADDED HERE TO FIX ERROR
                    st.download_button("📥 Download PDF", pdf_t, file_name=f"{class_name}_T.pdf", mime="application/pdf", key=f"dl_t_{record_id}")
                else:
                    st.info("No transcript yet.")

            with s_tab:
                if row[5]:
                    st.markdown(row[5])
                    pdf_s = create_pdf(f"Summary: {class_name}", row[5])
                    # KEY ADDED HERE TO FIX ERROR
                    st.download_button("📥 Download PDF", pdf_s, file_name=f"{class_name}_S.pdf", mime="application/pdf", key=f"dl_s_{record_id}")
                else:
                    st.info("No summary yet.")

# --- 3. UPLOAD AUDIO ---
elif selection == "📤 Upload Audio":
    st.header("Upload Audio File")
    up_name = st.text_input("Name", "Seminar Audio")
    up_file = st.file_uploader("MP3/WAV", type=['mp3', 'wav'])
    if up_file and st.button("Add to Library"):
        save_path = os.path.join("recordings", up_file.name)
        with open(save_path, "wb") as f: f.write(up_file.read())
        c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                  ("Upload", up_name, save_path, "", "", str(datetime.now())))
        conn.commit()
        st.success("Added!")

# --- 4. UPLOAD PDF ---
elif selection == "📄 Upload PDF":
    st.header("Summarize PDF Document")
    pdf_file = st.file_uploader("Upload Class PDF", type=['pdf'])
    if pdf_file and st.button("Generate Summary"):
        reader = PdfReader(pdf_file)
        text = "".join([p.extract_text() for p in reader.pages])
        points = "\n".join([f"• {s.strip()}" for s in text.split(". ")[:20] if len(s) > 10])
        summary_text = f"### 📄 PDF SUMMARY:\n{points}"
        c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                  ("PDF", pdf_file.name, "N/A", text, summary_text, str(datetime.now())))
        conn.commit()
        st.success("PDF Summarized!")
