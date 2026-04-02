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
    # Cleans text for PDF compatibility (handles Swahili/English chars)
    clean_text = text.encode('latin-1', 'replace').decode('latin-1')
    pdf.multi_cell(0, 10, txt=clean_text)
    return pdf.output(dest='S').encode('latin-1')

# --- CONFIG & DB ---
st.set_page_config(page_title="Class Master Pro", layout="wide")
if not os.path.exists("recordings"): os.makedirs("recordings")

@st.cache_resource
def load_model():
    return WhisperModel("base", device="cpu", compute_type="int8")

model = load_model()
conn = sqlite3.connect('class_pro_v6.db', check_same_thread=False)
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS records 
             (id INTEGER PRIMARY KEY, type TEXT, class_name TEXT, file_path TEXT, 
              transcript TEXT, summary TEXT, date TEXT)''')
conn.commit()

# --- SIDEBAR ---
with st.sidebar:
    st.title("🎓 Study Pro")
    selection = st.radio("GO TO:", ["🎙️ Start Recording", "📚 Saved & Notes", "📤 Upload Audio", "📄 Upload PDF"])

# --- 1. RECORDING ---
if selection == "🎙️ Start Recording":
    st.header("New Recording")
    name_input = st.text_input("Class Name", "Economics 101")
    audio_record = mic_recorder(start_prompt="🔴 Start", stop_prompt="⏹️ Save", key='recorder')
    if audio_record:
        save_path = os.path.join("recordings", f"{name_input}_{datetime.now().strftime('%H%M%S')}.mp3")
        with open(save_path, "wb") as f: f.write(audio_record['bytes'])
        c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                  ("Live", name_input, save_path, "", "", str(datetime.now())))
        conn.commit()
        st.success("Saved! Go to Library.")

# --- 2. LIBRARY (The Main Logic) ---
elif selection == "📚 Saved & Notes":
    st.header("Your Library")
    rows = c.execute("SELECT * FROM records ORDER BY id DESC").fetchall()
    
    for row in rows:
        rid, rtype, rname, rpath, rtrans, rsum, rdate = row
        
        with st.expander(f"📁 {rname.upper()} ({rtype})"):
            if os.path.exists(rpath): st.audio(rpath)
            
            btn_col1, btn_col2, btn_col3 = st.columns(3)
            
            # STEP 1: TRANSCRIBE
            if btn_col1.button(f"📝 Transcribe", key=f"t_btn_{rid}"):
                with st.spinner("AI Listening..."):
                    segments, _ = model.transcribe(rpath)
                    text = " ".join([s.text for s in segments])
                    c.execute("UPDATE records SET transcript=? WHERE id=?", (text, rid))
                    conn.commit()
                    st.rerun()

            # STEP 2: SUMMARIZE (The Smart Notes Point)
            if btn_col2.button(f"✨ Summarize", key=f"s_btn_{rid}"):
                if rtrans:
                    with st.spinner("Creating Note Points..."):
                        # Logic: Take sentences > 40 chars (important info) and limit to top 12
                        sentences = [s.strip() for s in rtrans.split(". ") if len(s) > 40]
                        smart_notes = "KEY TAKEAWAYS & NOTES:\n\n" + "\n".join([f"• {s}" for s in sentences[:12]])
                        c.execute("UPDATE records SET summary=? WHERE id=?", (smart_notes, rid))
                        conn.commit()
                        st.rerun()
                else: st.error("Transcribe first!")

            if btn_col3.button(f"🗑️ Delete", key=f"d_btn_{rid}"):
                c.execute("DELETE FROM records WHERE id=?", (rid,))
                conn.commit()
                st.rerun()

            # --- DISPLAY & DOWNLOADS ---
            tab1, tab2 = st.tabs(["📜 Full Transcript", "💡 Smart Summary"])
            
            with tab1:
                if rtrans:
                    st.text_area("Transcript", rtrans, height=150, key=f"ta_{rid}")
                    pdf_t = create_pdf(f"Transcript: {rname}", rtrans)
                    st.download_button("📥 Download PDF Transcript", pdf_t, f"{rname}_T.pdf", "application/pdf", key=f"dl_t_{rid}")
                else: st.info("Waiting for transcription...")

            with tab2:
                if rsum:
                    st.markdown(rsum)
                    pdf_s = create_pdf(f"Summary: {rname}", rsum)
                    st.download_button("📥 Download PDF Summary", pdf_s, f"{rname}_Summary.pdf", "application/pdf", key=f"dl_s_{rid}")
                else: st.info("Click 'Summarize' to generate notes.")

# (Upload Audio & PDF pages follow the same simple logic)
