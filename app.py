import streamlit as st
from streamlit_mic_recorder import mic_recorder
from faster_whisper import WhisperModel
import os
import sqlite3
from datetime import datetime
from PyPDF2 import PdfReader
from fpdf import FPDF # New Library

# --- 1. PDF GENERATOR FUNCTION ---
def create_pdf(title, text):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt=title, ln=1, align='C')
    pdf.set_font("Arial", size=12)
    pdf.ln(10)
    # Multi_cell handles long text and wrapping
    pdf.multi_cell(0, 10, txt=text.encode('latin-1', 'replace').decode('latin-1'))
    return pdf.output(dest='S').encode('latin-1')

# --- CONFIG & DIRECTORIES ---
st.set_page_config(page_title="Class Master Dashboard", layout="wide")
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
    selection = st.radio(
        "GO TO:",
        ["🎙️ Start Recording", "📚 Saved & Notes", "📤 Upload Audio", "📄 Upload PDF"]
    )
    st.markdown("---")
    st.info("System: Local Offline Mode")

# --- 1. START RECORDING PAGE ---
if selection == "🎙️ Start Recording":
    st.header("New Class Recording")
    name_input = st.text_input("Enter Class Name", "Economics Lecture 1")
    st.write("---")
    audio_record = mic_recorder(start_prompt="🔴 Start Recording", stop_prompt="⏹️ Stop and Save", key='recorder')

    if audio_record:
        timestamp = datetime.now().strftime('%H%M%S')
        file_name = f"{name_input.replace(' ', '_')}_{timestamp}.mp3"
        save_path = os.path.join("recordings", file_name)
        with open(save_path, "wb") as f:
            f.write(audio_record['bytes'])
        c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                  ("Live", name_input, save_path, "", "", str(datetime.now())))
        conn.commit()
        st.success(f"✅ Saved!")

# --- 2. SAVED & NOTES PAGE (PDF DOWNLOADS ADDED HERE) ---
elif selection == "📚 Saved & Notes":
    st.header("Your Library")
    search = st.text_input("🔍 Search...", "")
    rows = c.execute("SELECT * FROM records WHERE class_name LIKE ? ORDER BY id DESC", ('%' + search + '%',)).fetchall()
    
    for row in rows:
        with st.expander(f"📁 {row[2].upper()} | {row[6][:16]}"):
            if row[3] != "N/A" and os.path.exists(row[3]):
                st.audio(row[3])
            
            col_a, col_b, col_c = st.columns(3)
            
            if col_a.button(f"📝 Transcribe", key=f"t_{row[0]}"):
                with st.spinner("AI is listening..."):
                    segments, _ = model.transcribe(row[3])
                    text = " ".join([s.text for s in segments])
                    c.execute("UPDATE records SET transcript=? WHERE id=?", (text, row[0]))
                    conn.commit()
                    st.rerun()

            if col_b.button(f"✨ Note Points", key=f"s_{row[0]}"):
                if row[4]:
                    points = "\n".join([f"- {s.strip()}" for s in row[4].split(". ")[:25] if len(s) > 10])
                    summary = f"CLASS NOTES FOR: {row[2]}\n\n{points}"
                    c.execute("UPDATE records SET summary=? WHERE id=?", (summary, row[0]))
                    conn.commit()
                    st.rerun()
                else: st.error("Transcribe first!")

            if col_c.button(f"🗑️ Delete", key=f"del_{row[0]}"):
                if row[3] != "N/A" and os.path.exists(row[3]): os.remove(row[3])
                c.execute("DELETE FROM records WHERE id=?", (row[0],))
                conn.commit()
                st.rerun()

            tab_trans, tab_sum = st.tabs(["Transcript", "Summary"])
            
            with tab_trans:
                st.text_area("Full Text", row[4], height=200, key=f"ta_{row[0]}")
                if row[4]: # Only show download if text exists
                    pdf_data = create_pdf(f"Transcript: {row[2]}", row[4])
                    st.download_button("📥 Download Transcript (PDF)", pdf_data, file_name=f"{row[2]}_Transcript.pdf", mime="application/pdf")
            
            with tab_sum:
                st.markdown(row[5])
                if row[5]: # Only show download if summary exists
                    pdf_data = create_pdf(f"Summary: {row[2]}", row[5])
                    st.download_button("📥 Download Summary (PDF)", pdf_data, file_name=f"{row[2]}_Summary.pdf", mime="application/pdf")

# (Rest of the Upload Audio and PDF logic remains the same)
elif selection == "📤 Upload Audio":
    st.header("Upload Audio File")
    up_name = st.text_input("Name this file", "Seminar Audio")
    up_file = st.file_uploader("Choose MP3/WAV", type=['mp3', 'wav'])
    if up_file and st.button("Add to Library"):
        save_path = os.path.join("recordings", up_file.name)
        with open(save_path, "wb") as f: f.write(up_file.read())
        c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                  ("Upload", up_name, save_path, "", "", str(datetime.now())))
        conn.commit()
        st.success("File added!")

elif selection == "📄 Upload PDF":
    st.header("Summarize PDF Document")
    pdf_file = st.file_uploader("Upload Class PDF", type=['pdf'])
    if pdf_file and st.button("Generate PDF Summary"):
        reader = PdfReader(pdf_file)
        text = "".join([p.extract_text() for p in reader.pages])
        points = "\n".join([f"- {s.strip()}" for s in text.split(". ")[:20] if len(s) > 10])
        summary_text = f"### PDF SUMMARY:\n{points}"
        c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                  ("PDF", pdf_file.name, "N/A", text, summary_text, str(datetime.now())))
        conn.commit()
        st.success("PDF Summarized!")
