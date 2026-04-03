import streamlit as st
from streamlit_mic_recorder import mic_recorder
from faster_whisper import WhisperModel
import os
import sqlite3
from datetime import datetime
from PyPDF2 import PdfReader
from fpdf import FPDF
import streamlit.components.v1 as components

# --- 1. PDF GENERATOR HELPER ---
def create_pdf(title, text):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt=title, ln=1, align='C')
    pdf.ln(10)
    pdf.set_font("Arial", size=12)
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

conn = sqlite3.connect('class_pro_v6.db', check_same_thread=False)
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS records 
             (id INTEGER PRIMARY KEY, type TEXT, class_name TEXT, file_path TEXT, 
              transcript TEXT, summary TEXT, date TEXT)''')
conn.commit()

# --- SIDEBAR ---
with st.sidebar:
    st.title("🎓 Study Pro")
    st.markdown("---")
    selection = st.radio("GO TO:", ["🎙️ Start Recording", "📚 Saved & Notes", "📤 Upload Audio", "📄 Upload PDF"])
    st.markdown("---")
    st.info("System: Local AI Engine Active")

# --- 1. START RECORDING PAGE ---
if selection == "🎙️ Start Recording":
    st.header("New Class Recording")
    
    # Initialize session state for the timer toggle
    if 'is_recording' not in st.session_state:
        st.session_state.is_recording = False

    name_input = st.text_input("Enter Class Name", "New Lecture")
    
    col_rec, col_tm = st.columns([1, 1])
    
    with col_rec:
        # Toggle buttons to control the visual stopwatch
        if not st.session_state.is_recording:
            if st.button("🔴 Prepare Recorder"):
                st.session_state.is_recording = True
                st.rerun()
        else:
            if st.button("⏹️ Reset Timer"):
                st.session_state.is_recording = False
                st.rerun()

        audio_record = mic_recorder(
            start_prompt="Start Mic", 
            stop_prompt="Stop & Save Audio", 
            key='main_recorder'
        )

    with col_tm:
        if st.session_state.is_recording:
            st.markdown("### ⏱️ Recording Time")
            components.html("""
                <div id="stopwatch" style="font-family:monospace; font-size:35px; color:#ff4b4b; text-align:center; background:#1e1e1e; padding:10px; border-radius:10px; border:2px solid #ff4b4b;">00:00:00</div>
                <script>
                    let seconds = 0;
                    setInterval(() => {
                        seconds++;
                        let hrs = Math.floor(seconds / 3600);
                        let mins = Math.floor((seconds % 3600) / 60);
                        let secs = seconds % 60;
                        document.getElementById('stopwatch').innerText = 
                            (hrs<10?"0"+hrs:hrs)+":"+(mins<10?"0"+mins:mins)+":"+(secs<10?"0"+secs:secs);
                    }, 1000);
                </script>
            """, height=100)
        else:
            st.write("Timer Idle. Click 'Prepare Recorder' to start.")

    if audio_record:
        timestamp = datetime.now().strftime('%H%M%S')
        file_name = f"{name_input.replace(' ', '_')}_{timestamp}.mp3"
        save_path = os.path.join("recordings", file_name)
        with open(save_path, "wb") as f:
            f.write(audio_record['bytes'])
        
        c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                  ("Live", name_input, save_path, "", "", str(datetime.now())))
        conn.commit()
        st.session_state.is_recording = False # Auto-stop timer on save
        st.success(f"✅ Saved!")

# --- 2. SAVED & NOTES PAGE (FIXED DOWNLOAD BUTTONS) ---
elif selection == "📚 Saved & Notes":
    st.header("Your Library")
    search = st.text_input("🔍 Search...", "")
    rows = c.execute("SELECT * FROM records WHERE class_name LIKE ? ORDER BY id DESC", ('%' + search + '%',)).fetchall()
    
    for row in rows:
        rid, rtype, rname, rpath, rtrans, rsum, rdate = row
        with st.expander(f"📁 {rname.upper()} | {rdate[:16]}"):
            if rpath != "N/A": st.audio(rpath)
            
            btn_col1, btn_col2, btn_col3 = st.columns(3)
            
            if btn_col1.button("📝 Transcribe", key=f"trans_{rid}"):
                segments, _ = model.transcribe(rpath)
                full_text = " ".join([s.text for s in segments])
                c.execute("UPDATE records SET transcript=? WHERE id=?", (full_text, rid))
                conn.commit()
                st.rerun()

            if btn_col2.button("✨ Summarize", key=f"sum_{rid}"):
                if rtrans:
                    summary = f"### Summary for {rname}\n" + "\n".join([f"• {s}" for s in rtrans.split(". ")[:5]])
                    c.execute("UPDATE records SET summary=? WHERE id=?", (summary, rid))
                    conn.commit()
                    st.rerun()

            if btn_col3.button("🗑️ Delete", key=f"del_{rid}"):
                c.execute("DELETE FROM records WHERE id=?", (rid,))
                conn.commit()
                st.rerun()

            t_tab, s_tab = st.tabs(["Transcript", "Summary"])
            with t_tab:
                if rtrans:
                    st.text_area("Text", rtrans, key=f"txt_{rid}")
                    # FIXED: Added unique key to download button
                    st.download_button("📥 Download PDF", create_pdf("Transcript", rtrans), f"{rname}_T.pdf", key=f"dl_t_{rid}")
            with s_tab:
                if rsum:
                    st.markdown(rsum)
                    # FIXED: Added unique key to download button
                    st.download_button("📥 Download PDF", create_pdf("Summary", rsum), f"{rname}_S.pdf", key=f"dl_s_{rid}")

# --- 3. UPLOAD AUDIO ---
elif selection == "📤 Upload Audio":
    st.header("Upload")
    up_file = st.file_uploader("Audio", type=['mp3', 'wav'])
    if up_file and st.button("Save Audio"):
        save_path = os.path.join("recordings", up_file.name)
        with open(save_path, "wb") as f: f.write(up_file.read())
        c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                  ("Upload", up_file.name, save_path, "", "", str(datetime.now())))
        conn.commit()
        st.success("Uploaded!")

# --- 4. UPLOAD PDF ---
elif selection == "📄 Upload PDF":
    st.header("PDF Summary")
    pdf_file = st.file_uploader("PDF", type=['pdf'])
    if pdf_file and st.button("Analyze PDF"):
        reader = PdfReader(pdf_file)
        text = "".join([p.extract_text() for p in reader.pages])
        c.execute("INSERT INTO records (type, class_name, file_path, transcript, summary, date) VALUES (?,?,?,?,?,?)",
                  ("PDF", pdf_file.name, "N/A", text, "Summary Pending...", str(datetime.now())))
        conn.commit()
        st.success("PDF Recorded!")
