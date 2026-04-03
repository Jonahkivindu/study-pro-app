import streamlit as st
from streamlit_mic_recorder import mic_recorder
from faster_whisper import WhisperModel
import os
import sqlite3
from datetime import datetime
from PyPDF2 import PdfReader
from fpdf import FPDF
import streamlit.components.v1 as components

# --- 1. PROFESSIONAL PDF GENERATOR (High-Authority Layout) ---
def create_pdf(title, text):
    pdf = FPDF()
    pdf.add_page()
    
    # Header Banner (Dark Theme)
    pdf.set_fill_color(30, 30, 30)
    pdf.rect(0, 0, 210, 40, 'F')
    
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Arial", 'B', 18)
    pdf.cell(0, 15, txt="ACADEMIC INTELLIGENCE REPORT", ln=1, align='C')
    
    pdf.set_font("Arial", 'I', 9)
    pdf.cell(0, 10, txt=f"Date: {datetime.now().strftime('%Y-%m-%d')} | System ID: CMP-800", ln=1, align='C')
    
    # Body Content
    pdf.ln(20)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, txt=title.upper(), ln=1)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)
    
    pdf.set_font("Arial", size=11)
    # Handle UTF-8 to Latin-1 conversion safely for PDF
    clean_text = text.encode('latin-1', 'replace').decode('latin-1')
    pdf.multi_cell(0, 8, txt=clean_text)
    
    return pdf.output(dest='S').encode('latin-1')

# --- 2. CONFIG & STYLING ---
st.set_page_config(page_title="Class Master Pro", layout="wide", page_icon="🎓")

st.markdown("""
    <style>
    .stApp { background-color: #0d1117; color: #c9d1d9; }
    .stButton>button { border-radius: 6px; font-weight: 600; transition: 0.2s; }
    .stButton>button:hover { border-color: #58a6ff; color: #58a6ff; }
    div[data-testid="stExpander"] { background: #161b22; border: 1px solid #30363d; border-radius: 8px; }
    </style>
    """, unsafe_allow_html=True)

if not os.path.exists("recordings"): 
    os.makedirs("recordings")

@st.cache_resource
def load_ai():
    return WhisperModel("base", device="cpu", compute_type="int8")

whisper_ai = load_ai()

# Database Setup
conn = sqlite3.connect('academic_vault_v8.db', check_same_thread=False)
db = conn.cursor()
db.execute('''CREATE TABLE IF NOT EXISTS vault 
             (id INTEGER PRIMARY KEY, category TEXT, title TEXT, path TEXT, 
              content TEXT, summary TEXT, date TEXT)''')
conn.commit()

# --- 3. SIDEBAR ---
with st.sidebar:
    st.title("🎓 CMP ELITE")
    st.markdown("---")
    nav = st.radio("GO TO:", ["🎙️ Live Session", "📚 Research Vault", "📤 External Import", "📄 PDF Intelligence"])
    st.markdown("---")
    st.success("AI Core: Connected")
    st.caption("v8.0 Professional Edition")

# --- MODULE 1: LIVE SESSION ---
if nav == "🎙️ Live Session":
    st.header("Lecture Capture Interface")
    
    if 'session_active' not in st.session_state:
        st.session_state.session_active = False

    col_meta, col_timer = st.columns([2, 1])
    
    with col_meta:
        lecture_title = st.text_input("Lecture Reference", f"Lec_{datetime.now().strftime('%H%M')}")
        discipline = st.selectbox("Academic Discipline", ["Science", "Business", "Law", "Tech", "Arts"])

    with col_timer:
        if st.session_state.session_active:
            st.markdown("#### ⏱️ ELAPSED TIME")
            components.html("""
                <div id="stopwatch" style="font-family:monospace; font-size:32px; color:#58a6ff; text-align:center; background:#0d1117; padding:10px; border-radius:10px; border:2px solid #30363d;">00:00:00</div>
                <script>
                    let s = 0;
                    setInterval(() => {
                        s++;
                        let h=Math.floor(s/3600); let m=Math.floor((s%3600)/60); let sec=s%60;
                        document.getElementById('stopwatch').innerText = (h<10?"0"+h:h)+":"+(m<10?"0"+m:m)+":"+(sec<10?"0"+sec:sec);
                    }, 1000);
                </script>
            """, height=100)

    st.markdown("---")
    
    c1, c2 = st.columns(2)
    with c1:
        if not st.session_state.session_active:
            if st.button("🚀 INITIALIZE RECORDER", type="primary", use_container_width=True):
                st.session_state.session_active = True
                st.rerun()
        else:
            if st.button("⏹️ ABORT SESSION", use_container_width=True):
                st.session_state.session_active = False
                st.rerun()

    if st.session_state.session_active:
        audio_data = mic_recorder(start_prompt="Start Mic", stop_prompt="Save to Archive", key='elite_mic')
        
        if audio_data:
            file_name = f"recordings/{lecture_title.replace(' ', '_')}.mp3"
            with open(file_name, "wb") as f:
                f.write(audio_data['bytes'])
            
            db.execute("INSERT INTO vault (category, title, path, content, summary, date) VALUES (?,?,?,?,?,?)",
                      (discipline, lecture_title, file_name, "", "", datetime.now().strftime("%Y-%m-%d %H:%M")))
            conn.commit()
            st.session_state.session_active = False
            st.success("Session Synchronized & Saved!")
            st.balloons()
            st.rerun()

# --- MODULE 2: RESEARCH VAULT ---
elif nav == "📚 Research Vault":
    st.header("Academic Archive")
    search = st.text_input("🔍 Search Archive...", "")
    records = db.execute("SELECT * FROM vault WHERE title LIKE ? ORDER BY id DESC", ('%'+search+'%',)).fetchall()

    for r in records:
        rid, rcat, rtitle, rpath, rcontent, rsum, rdate = r
        with st.expander(f"📁 [{rcat}] {rtitle.upper()} — {rdate}"):
            if rpath != "N/A": st.audio(rpath)
            
            btn_col1, btn_col2, btn_col3 = st.columns(3)
            
            if btn_col1.button("📝 RUN AI TRANSCRIPTION", key=f"t_{rid}"):
                with st.spinner("AI Listening..."):
                    segs, _ = whisper_ai.transcribe(rpath)
                    full_text = " ".join([s.text for s in segs])
                    db.execute("UPDATE vault SET content=? WHERE id=?", (full_text, rid))
                    conn.commit()
                    st.rerun()

            if btn_col2.button("✨ GENERATE SMART BRIEF", key=f"s_{rid}"):
                if rcontent:
                    with st.spinner("Analyzing Concepts..."):
                        lines = [l.strip() for l in rcontent.split(".") if len(l) > 35]
                        
                        # Perfect Summarization Logic
                        kp = [f"• {l}" for l in lines if any(w in l.lower() for w in ["important", "key", "remember", "concept"])]
                        ai_items = [f"• {l}" for l in lines if any(w in l.lower() for w in ["do", "task", "submit", "assignment"])]
                        
                        summary = f"## 🎓 EXECUTIVE BRIEF: {rtitle.upper()}\n\n"
                        summary += "### 🎯 CORE ACADEMIC CONCEPTS\n"
                        summary += "\n".join(kp[:6]) if kp else "\n".join([f"• {l}" for l in lines[:6]])
                        
                        if ai_items:
                            summary += "\n\n### 📅 ACTION ITEMS & TASKS\n"
                            summary += "\n".join(ai_items[:4])
                            
                        summary += f"\n\n---\n*Auto-generated Report | {datetime.now().strftime('%Y-%m-%d')}*"
                        
                        db.execute("UPDATE vault SET summary=? WHERE id=?", (summary, rid))
                        conn.commit()
                        st.rerun()
                else: st.warning("Transcript required for analysis.")

            if btn_col3.button("🗑️ PURGE", key=f"d_{rid}"):
                db.execute("DELETE FROM vault WHERE id=?", (rid,))
                conn.commit()
                st.rerun()

            t_tab, s_tab = st.tabs(["📜 Transcript", "💡 Professional Summary"])
            with t_tab:
                if rcontent:
                    st.text_area("Full Transcription", rcontent, height=250, key=f"ta_{rid}")
                    st.download_button("📥 Download PDF", create_pdf(f"Transcript: {rtitle}", rcontent), f"{rtitle}_T.pdf", key=f"dl_t_{rid}")
            with s_tab:
                if rsum:
                    st.markdown(rsum)
                    st.download_button("📥 Download Summary PDF", create_pdf(f"Summary: {rtitle}", rsum), f"{rtitle}_S.pdf", key=f"dl_s_{rid}")

# --- MODULES 3 & 4 (SIMPLIFIED FOR PRO USE) ---
elif nav == "📤 External Import":
    st.header("Import External Audio")
    up = st.file_uploader("Upload MP3/WAV", type=['mp3', 'wav'])
    if up and st.button("Commit to Archive"):
        path = f"recordings/{up.name}"
        with open(path, "wb") as f: f.write(up.read())
        db.execute("INSERT INTO vault (category, title, path, content, summary, date) VALUES (?,?,?,?,?,?)",
                  ("External", up.name, path, "", "", str(datetime.now())))
        conn.commit()
        st.success("Import successful.")

elif nav == "📄 PDF Intelligence":
    st.header("Document Knowledge Extraction")
    pdf = st.file_uploader("Upload Notes PDF", type=['pdf'])
    if pdf and st.button("Extract Insight"):
        reader = PdfReader(pdf)
        text = " ".join([p.extract_text() for p in reader.pages])
        db.execute("INSERT INTO vault (category, title, path, content, summary, date) VALUES (?,?,?,?,?,?)",
                  ("Document", pdf.name, "N/A", text, "Analysis ready in Vault.", str(datetime.now())))
        conn.commit()
        st.success("Document analyzed and stored.")
