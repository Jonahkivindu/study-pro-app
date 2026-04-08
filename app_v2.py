import streamlit as st
from streamlit_mic_recorder import mic_recorder
from faster_whisper import WhisperModel
import os
import sqlite3
from datetime import datetime
from PyPDF2 import PdfReader
from fpdf import FPDF
import streamlit.components.v1 as components

# --- 1. CONFIG & STYLING ---
st.set_page_config(page_title="StudyPro Elite", layout="wide", page_icon="🎓")

st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    .stApp { 
        background-color: #09090b; 
        color: #fafafa; 
    }
    
    /* Modern minimalist inputs */
    .stTextInput>div>div>input, .stTextArea>div>div>textarea, .stSelectbox>div>div>div {
        background-color: #141415 !important;
        color: #fafafa !important;
        border: 1px solid #27272a !important;
        border-radius: 8px;
    }
    
    /* Buttons */
    .stButton>button { 
        border-radius: 8px; 
        font-weight: 600; 
        transition: 0.3s;
        border: 1px solid #27272a;
        background-color: #18181b;
        color: #fafafa;
    }
    .stButton>button:hover { 
        border-color: #3b82f6; 
        color: #3b82f6;
        background-color: #1a1a2e;
        transform: translateY(-2px);
    }
    
    /* Primary buttons */
    button[data-testid="baseButton-primary"] {
        background: linear-gradient(135deg, #2563eb, #3b82f6);
        border: none;
        color: white !important;
    }
    button[data-testid="baseButton-primary"]:hover {
        background: linear-gradient(135deg, #1d4ed8, #2563eb);
    }

    /* Cards / Expanders */
    div[data-testid="stExpander"] { 
        background: #141415; 
        border: 1px solid #27272a; 
        border-radius: 12px; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        margin-bottom: 12px;
    }
    div[data-testid="stExpander"] details summary {
        color: #e4e4e7;
        font-weight: 600;
        font-size: 1.05rem;
    }
    
    /* Custom Stats styling via container */
    .stat-container {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
    }
    .stat-box {
        background: #141415;
        border: 1px solid #27272a;
        padding: 20px;
        border-radius: 12px;
        flex: 1;
        text-align: center;
    }
    .stat-value {
        font-size: 2rem;
        font-weight: 800;
        color: #3b82f6;
    }
    .stat-title {
        font-size: 0.85rem;
        color: #a1a1aa;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    /* Header Divider */
    hr {
        border-color: #27272a;
    }
    </style>
""", unsafe_allow_html=True)

if not os.path.exists("recordings"): 
    os.makedirs("recordings")

# --- 2. CORE UTILS & AI ---
@st.cache_resource
def load_ai():
    # Model loaded once globally
    return WhisperModel("base", device="cpu", compute_type="int8")

whisper_ai = load_ai()

def create_pdf(title, text):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_fill_color(30, 30, 30)
    pdf.rect(0, 0, 210, 40, 'F')
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Arial", 'B', 18)
    pdf.cell(0, 15, txt="ACADEMIC INTELLIGENCE REPORT", ln=1, align='C')
    pdf.set_font("Arial", 'I', 9)
    pdf.cell(0, 10, txt=f"Date: {datetime.now().strftime('%Y-%m-%d')} | System ID: CMP-800", ln=1, align='C')
    pdf.ln(20)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 10, txt=title.upper(), ln=1)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)
    pdf.set_font("Arial", size=11)
    clean_text = text.encode('latin-1', 'replace').decode('latin-1')
    pdf.multi_cell(0, 8, txt=clean_text)
    return pdf.output(dest='S').encode('latin-1')

def offline_rag_search(query, context):
    """Local, offline, lightweight RAG implementation using keyword overlap."""
    if not context: return "No transcript available."
    query_words = set([w.strip('()?,.!') for w in query.lower().split() if len(w) > 3])
    if not query_words: return "Please enter a more specific question."
    
    sentences = [s.strip() + "." for s in context.split(".") if len(s.strip()) > 10]
    scored = []
    
    for s in sentences:
        s_words = set([w.strip('()?,.!') for w in s.lower().split()])
        score = len(query_words.intersection(s_words))
        if score > 0:
            scored.append((score, s))
            
    if scored:
        scored.sort(reverse=True, key=lambda x: x[0])
        best = [s for _, s in scored[:4]]  # Top 4 sentences
        return " ".join(best)
    return "I couldn't find direct information regarding that in the lecture context."

# --- 3. DATABASE (V2 Schema) ---
conn = sqlite3.connect('studypro_elite.db', check_same_thread=False)
db = conn.cursor()
# Added 'notes' and 'status' columns compared to v1
db.execute('''CREATE TABLE IF NOT EXISTS vault 
             (id INTEGER PRIMARY KEY, category TEXT, title TEXT, path TEXT, 
              content TEXT, summary TEXT, date TEXT, notes TEXT, status TEXT)''')
conn.commit()

# --- 4. NAVIGATION & SIDEBAR ---
with st.sidebar:
    st.markdown("## 🎓 StudyPro Elite")
    st.caption("Local AI Core: Connected")
    st.markdown("---")
    nav = st.radio("MAIN MENU", ["📊 Dashboard", "🎙️ Capture Lab", "📚 Study Vault"])
    st.markdown("---")
    st.markdown("### Settings")
    st.caption("No API keys needed. All processing uses local Whisper CPU.")

# --- MODULE 1: DASHBOARD ---
if nav == "📊 Dashboard":
    st.title("Welcome back!")
    st.markdown("Here is your academic overview.")
    
    stats = db.execute("SELECT COUNT(id), SUM(LENGTH(content)), COUNT(CASE WHEN status='Mastered' THEN 1 END) FROM vault").fetchone()
    total_recs = stats[0] or 0
    total_words = (stats[1] or 0) // 6  # Rough approx chars to words
    mastered = stats[2] or 0
    
    st.markdown(f"""
    <div class="stat-container">
        <div class="stat-box">
            <div class="stat-value">{total_recs}</div>
            <div class="stat-title">Lectures Recorded</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">{total_words:,}</div>
            <div class="stat-title">Words Transcribed</div>
        </div>
        <div class="stat-box">
            <div class="stat-value" style="color: #10b981;">{mastered}</div>
            <div class="stat-title">Topics Mastered</div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    st.subheader("⏱️ Recent Activity")
    recent = db.execute("SELECT title, category, date FROM vault ORDER BY id DESC LIMIT 3").fetchall()
    if recent:
        for r in recent:
            st.info(f"**{r[0]}** ({r[1]}) - {r[2]}")
    else:
        st.write("No recordings yet. Head to Capture Lab!")

# --- MODULE 2: CAPTURE LAB ---
elif nav == "🎙️ Capture Lab":
    st.title("🎙️ Capture Lab")
    
    tab1, tab2 = st.tabs(["🔴 Live Recording", "📤 File Upload (Audio/PDF)"])
    
    with tab1:
        st.markdown("Capture high-quality audio directly from your browser. Our local AI will process it privately.")
        if 'session_active' not in st.session_state:
            st.session_state.session_active = False

        c1, c2 = st.columns([2, 1])
        with c1:
            lecture_title = st.text_input("Lecture Reference", f"Class_{datetime.now().strftime('%H%M')}")
            discipline = st.selectbox("Discipline", ["Science", "Business", "Law", "Tech", "Arts", "Other"])
        
        with c2:
            if st.session_state.session_active:
                st.markdown("<p style='text-align:center; font-weight:bold; color:#ef4444;'>⏱️ RECORDING IN PROGRESS</p>", unsafe_allow_html=True)
                components.html("""
                    <div id="stopwatch" style="font-family:monospace; font-size:32px; color:#ef4444; text-align:center; background:#141415; padding:10px; border-radius:10px; border:1px solid #ef4444;">00:00:00</div>
                    <script>
                        let s = 0; setInterval(() => { s++;
                            let h=Math.floor(s/3600); let m=Math.floor((s%3600)/60); let sec=s%60;
                            document.getElementById('stopwatch').innerText = (h<10?"0"+h:h)+":"+(m<10?"0"+m:m)+":"+(sec<10?"0"+sec:sec);
                        }, 1000);
                    </script>
                """, height=100)

        st.markdown("---")
        b1, b2 = st.columns(2)
        with b1:
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
                file_name = f"recordings/{lecture_title.replace(' ', '_')}_{datetime.now().strftime('%M%S')}.mp3"
                with open(file_name, "wb") as f:
                    f.write(audio_data['bytes'])
                
                db.execute("INSERT INTO vault (category, title, path, content, summary, date, notes, status) VALUES (?,?,?,?,?,?,?,?)",
                          (discipline, lecture_title, file_name, "", "", datetime.now().strftime("%Y-%m-%d %H:%M"), "", "Needs Review"))
                conn.commit()
                st.session_state.session_active = False
                st.success("Audio captured and securely stored in your Vault!")
                st.balloons()
                st.rerun()

    with tab2:
        st.info("Upload pre-recorded lecture audio (MP3/WAV) or a PDF syllabus/notes.")
        up = st.file_uploader("Select File", type=['mp3', 'wav', 'pdf'])
        if up and st.button("Upload to Vault", type="primary"):
            if up.name.endswith(('.mp3', '.wav')):
                path = f"recordings/{up.name}"
                with open(path, "wb") as f: f.write(up.read())
                db.execute("INSERT INTO vault (category, title, path, content, summary, date, notes, status) VALUES (?,?,?,?,?,?,?,?)",
                          ("Imported Audio", up.name, path, "", "", str(datetime.now().strftime("%Y-%m-%d")), "", "Needs Review"))
                conn.commit()
                st.success("Successfully imported.")
            elif up.name.endswith('.pdf'):
                reader = PdfReader(up)
                text = " ".join([p.extract_text() for p in reader.pages])
                db.execute("INSERT INTO vault (category, title, path, content, summary, date, notes, status) VALUES (?,?,?,?,?,?,?,?)",
                          ("Imported PDF", up.name, "N/A", text, "", str(datetime.now().strftime("%Y-%m-%d")), "", "Needs Review"))
                conn.commit()
                st.success("PDF knowledge intelligently extracted.")

# --- MODULE 3: STUDY VAULT ---
elif nav == "📚 Study Vault":
    st.title("📚 Study Vault")
    search = st.text_input("🔍 Search Transcripts & Titles...", placeholder="Search for concepts, keywords, or class names...")
    
    if search:
        records = db.execute("SELECT * FROM vault WHERE title LIKE ? OR content LIKE ? ORDER BY id DESC", ('%'+search+'%', '%'+search+'%')).fetchall()
    else:
        records = db.execute("SELECT * FROM vault ORDER BY id DESC").fetchall()

    if not records:
        st.write("No records found in the Vault.")
        
    for r in records:
        rid, rcat, rtitle, rpath, rcontent, rsum, rdate, rnotes, rstatus = r
        
        # Color coding status
        status_color = "🟢" if rstatus == "Mastered" else "🟠"
        
        with st.expander(f"{status_color} [{rcat}] {rtitle} — {rdate[:10]}"):
            
            # Action Row
            colA, colB, colC, colD = st.columns(4)
            if colA.button("📝 RUN AI TRANSCRIPT", key=f"t_{rid}"):
                if rpath != "N/A":
                    with st.spinner("Local AI listening and transcribing (CPU)..."):
                        segs, _ = whisper_ai.transcribe(rpath)
                        full_text = " ".join([s.text for s in segs])
                        db.execute("UPDATE vault SET content=? WHERE id=?", (full_text, rid))
                        conn.commit()
                        st.rerun()
                else:
                    st.warning("No audio to transcribe.")
            
            if colB.button("✨ SMART SUMMARY", key=f"s_{rid}"):
                if rcontent:
                    with st.spinner("Extracting Concepts..."):
                        lines = [l.strip() for l in rcontent.split(".") if len(l) > 30]
                        kp = [f"• {l}" for l in lines if any(w in l.lower() for w in ["important", "key", "remember", "concept", "focus", "essential"])]
                        
                        summary = f"### 🎯 CORE CONCEPTS\n"
                        summary += "\n".join(kp[:8]) if kp else "\n".join([f"• {l}" for l in lines[:5]])
                        
                        db.execute("UPDATE vault SET summary=? WHERE id=?", (summary, rid))
                        conn.commit()
                        st.rerun()
                else: 
                    st.error("Transcript required. Run AI Transcript first.")

            # Toggle status
            new_status = "Mastered" if rstatus != "Mastered" else "Needs Review"
            if colC.button(f"Mark as '{new_status}'", key=f"st_{rid}"):
                db.execute("UPDATE vault SET status=? WHERE id=?", (new_status, rid))
                conn.commit()
                st.rerun()
                
            if colD.button("🗑️ PURGE", key=f"d_{rid}"):
                db.execute("DELETE FROM vault WHERE id=?", (rid,))
                conn.commit()
                st.rerun()

            if rpath != "N/A": 
                st.audio(rpath)

            # Study Interfaces
            tab_read, tab_chat, tab_flash, tab_notes = st.tabs(["📜 Document", "💬 AI Q&A", "🃏 Flashcards", "📝 My Notes"])
            
            with tab_read:
                st.markdown("#### Summary Insights")
                st.markdown(rsum if rsum else "*No summary generated yet.*")
                
                st.markdown("#### Full Transcript")
                st.text_area("Content", rcontent, height=150, key=f"ta_{rid}", disabled=True)
                
                if rcontent:
                    d1, d2 = st.columns(2)
                    d1.download_button("📥 Trans PDF", create_pdf(f"{rtitle}", rcontent), f"{rtitle}_T.pdf", key=f"dl_t_{rid}")
                    if rsum:
                        d2.download_button("📥 Summary PDF", create_pdf(f"Summary: {rtitle}", rsum), f"{rtitle}_S.pdf", key=f"dl_s_{rid}")

            with tab_chat:
                st.markdown("#### Local Context RAG Search")
                st.caption("Ask questions to retrieve relevant parts of this exact lecture entirely offline.")
                q = st.text_input("Ask a question:", key=f"q_{rid}")
                if st.button("Search Context", key=f"qbtn_{rid}"):
                    ans = offline_rag_search(q, rcontent)
                    st.info(f"**Insight:**\n\n{ans}")

            with tab_flash:
                st.markdown("#### Flashcards (Auto-extracted)")
                if rsum:
                    concepts = [c.replace('• ', '') for c in rsum.split('\n') if c.startswith('• ')]
                    for idx, c in enumerate(concepts):
                        st.markdown(f"""
                        <div style='background: #1e1e24; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 10px; border-radius: 8px;'>
                            <strong style='color:#3b82f6;'>Concept #{idx+1}</strong><br>
                            {c}
                        </div>
                        """, unsafe_allow_html=True)
                else:
                    st.write("*Generate a Smart Summary to auto-create flashcards.*")

            with tab_notes:
                notes_val = st.text_area("Personal Study Notes", value=rnotes if rnotes else "", height=150, key=f"n_{rid}")
                if st.button("Save Notes", key=f"ns_{rid}"):
                    db.execute("UPDATE vault SET notes=? WHERE id=?", (notes_val, rid))
                    conn.commit()
                    st.success("Notes saved!")
