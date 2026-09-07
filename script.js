// ⚠️ YAHAN APNI SUPABASE DETAILS DAAL (SABSE ZAROORI STEP)
const SUPABASE_URL = 'https://hafkxgipiqjmjhevjlsc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cbG1R6WokyUczPW4OWLHww_hqlM0JGg';

let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
    console.error("Supabase init failed. URL/Key check kar!", e);
}

function getCurrentUser() {
    const user = localStorage.getItem("learnLoopUser");
    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem("learnLoopUser");
    window.location.href = "login.html";
}

// ===== AUTH SYSTEM =====
async function signup(event) {
    event.preventDefault();
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    try {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);

        const { data, error } = await supabase.from('users').insert([{ email: email, password_hash: hash }]).select();
        if (error) throw error;

        localStorage.setItem("learnLoopUser", JSON.stringify({ id: data[0].id, email: data[0].email }));
        window.location.href = "onboarding.html";
    } catch (err) {
        alert("Signup Error: " + err.message);
    }
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const { data: users, error } = await supabase.from('users').select('*').eq('email', email);
        if (error) throw error;
        if (users.length === 0) { alert("User not found. Please sign up."); return; }

        const user = users[0];
        const isMatch = bcrypt.compareSync(password, user.password_hash);
        if (!isMatch) { alert("Incorrect password."); return; }

        localStorage.setItem("learnLoopUser", JSON.stringify({ id: user.id, email: user.email }));
        
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!profile) window.location.href = "onboarding.html";
        else window.location.href = "dashboard.html";
    } catch (err) {
        alert("Login Error: " + err.message);
    }
}

// ===== ONBOARDING =====
function selectSubject(btn) { btn.classList.toggle("selected"); }
function selectTime(btn) { document.querySelectorAll(".time-btn").forEach(b => b.classList.remove("selected")); btn.classList.add("selected"); }

async function saveOnboarding() {
    const year = document.getElementById("year").value;
    const branch = document.getElementById("branch").value;
    const selectedSubjects = document.querySelectorAll(".selection-btn.selected");
    const selectedTime = document.querySelector(".time-btn.selected");

    if (year === "" || branch === "" || selectedSubjects.length === 0 || !selectedTime) { alert("Please complete all sections."); return; }

    let subjects = [];
    selectedSubjects.forEach(btn => subjects.push(btn.innerText.trim()));

    const user = getCurrentUser();
    try {
        const { error } = await supabase.from('profiles').upsert({
            id: user.id, year: year, branch: branch, subjects: subjects, study_time: selectedTime.innerText, streak: 1
        });
        if (error) throw error;
        alert("Great! Your learning journey is personalized 🎯");
        window.location.href = "dashboard.html";
    } catch (err) {
        alert("Error saving data: " + err.message);
    }
}

// ===== DASHBOARD =====
async function loadDashboard() {
    const user = getCurrentUser();
    if (!user) { window.location.href = "login.html"; return; }

    try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
            document.getElementById("studentName").innerText = profile.full_name || "Student";
            document.getElementById("streakCount").innerText = profile.streak || 1;
        }
        const { data: quizzes } = await supabase.from('quiz_results').select('*').eq('user_id', user.id);
        if (quizzes && quizzes.length > 0) {
            let acc = quizzes.reduce((sum, q) => sum + q.accuracy, 0) / quizzes.length;
            document.getElementById("dashAccuracy").innerText = Math.round(acc) + "%";
        }
    } catch (err) { console.error("Dashboard load error:", err); }
}

// ===== LEARN =====
function openLearning(topic) {
    document.getElementById("popupIcon").innerText = "📖";
    document.getElementById("popupTitle").innerText = "Learning: " + topic;
    document.getElementById("popupMessage").innerText = "Your lesson content for " + topic + " will appear here.";
    document.getElementById("learnPopup").style.display = "flex";
}
function openNotes(topic) {
    document.getElementById("popupIcon").innerText = "📝";
    document.getElementById("popupTitle").innerText = "Handwritten Notes";
    document.getElementById("popupMessage").innerText = "Handwritten notes for " + topic + " will be available here.";
    document.getElementById("learnPopup").style.display = "flex";
}
function closeLearnPopup() { document.getElementById("learnPopup").style.display = "none"; }

// ===== AI =====
function quickQuestion(q) { document.getElementById("aiQuestion").value = q; }
function askLearnLoopAI() {
    const question = document.getElementById("aiQuestion").value.trim();
    const subject = document.getElementById("aiSubject").value;
    if (subject === "") { alert("Select a subject first."); return; }
    if (question === "") { alert("Enter your question."); return; }

    let answer = "";
    if (question.toLowerCase().includes("matrix")) answer = "A matrix is a rectangular arrangement of numbers into rows and columns.";
    else if (question.toLowerCase().includes("eigenvalue")) answer = "An eigenvalue is a special value associated with a square matrix.";
    else answer = "Great question! In the final version, AI will be connected to a real service.";

    document.getElementById("responseText").innerText = answer;
    document.getElementById("aiResponse").style.display = "block";
}

// ===== CHALLENGE (QUIZ) =====
const challengeQuestions = [
    { subject: "Mathematics", question: "Order of a matrix having 3 rows and 2 columns?", options: ["2 × 3", "3 × 2", "3 × 3", "2 × 2"], answer: 1 },
    { subject: "Programming", question: "Which symbol ends a statement in C?", options: [":", ".", ";", ","], answer: 2 },
    { subject: "Physics", question: "SI unit of force?", options: ["Joule", "Newton", "Watt", "Pascal"], answer: 1 },
    { subject: "Mathematics", question: "Which is a scalar quantity?", options: ["Velocity", "Force", "Acceleration", "Temperature"], answer: 3 },
    { subject: "Programming", question: "Data type to store an integer in C?", options: ["float", "char", "int", "double"], answer: 2 }
];
let currentQuestion = 0, score = 0, selectedAnswer = null, timeLeft = 300, timerInterval;

function startQuiz() {
    currentQuestion = 0; score = 0; selectedAnswer = null; timeLeft = 300;
    document.getElementById("quizCard").style.display = "block";
    document.getElementById("resultCard").style.display = "none";
    loadQuestion(); startTimer();
}

function loadQuestion() {
    const q = challengeQuestions[currentQuestion];
    document.getElementById("questionNumber").innerText = `Question ${currentQuestion + 1} of ${challengeQuestions.length}`;
    document.getElementById("questionSubject").innerText = q.subject;
    document.getElementById("questionText").innerText = q.question;
    
    const container = document.getElementById("optionsContainer");
    container.innerHTML = "";
    q.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerText = String.fromCharCode(65 + i) + ". " + opt;
        btn.onclick = () => selectAnswer(i, btn);
        container.appendChild(btn);
    });
    document.getElementById("quizProgress").style.width = `${((currentQuestion + 1) / challengeQuestions.length) * 100}%`;
}

function selectAnswer(index, button) {
    if (selectedAnswer !== null) return;
    selectedAnswer = index;
    const q = challengeQuestions[currentQuestion];
    const allOptions = document.querySelectorAll(".option-btn");
    allOptions.forEach(btn => btn.disabled = true);

    if (index === q.answer) {
        button.classList.add("correct"); score++;
    } else {
        button.classList.add("wrong");
        allOptions[q.answer].classList.add("correct");
    }
}

function nextQuestion() {
    if (selectedAnswer === null) { alert("Please select an answer first."); return; }
    if (currentQuestion < challengeQuestions.length - 1) { currentQuestion++; loadQuestion(); } 
    else { finishQuiz(); }
}

async function finishQuiz() {
    clearInterval(timerInterval);
    document.getElementById("quizCard").style.display = "none";
    document.getElementById("resultCard").style.display = "block";

    const total = challengeQuestions.length;
    const accuracy = Math.round((score / total) * 100);

    document.getElementById("finalScore").innerText = `${score}/${total}`;
    document.getElementById("correctAnswers").innerText = score;
    document.getElementById("wrongAnswers").innerText = total - score;
    document.getElementById("accuracy").innerText = `${accuracy}%`;

    const user = getCurrentUser();
    if (user) {
        try {
            await supabase.from('quiz_results').insert({ user_id: user.id, score: score, total_questions: total, accuracy: accuracy });
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (profile) {
                await supabase.from('profiles').update({ streak: (profile.streak || 1) + 1 }).eq('id', user.id);
            }
        } catch (err) { console.error("Quiz save error:", err); }
    }
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timeLeft <= 0) { clearInterval(timerInterval); finishQuiz(); return; }
        timeLeft--;
        const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
        document.getElementById("timer").innerText = `⏱️ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);
}
function restartQuiz() { startQuiz(); }

// ===== PROGRESS PAGE =====
async function loadProgress() {
    const user = getCurrentUser();
    if (!user) { window.location.href = "login.html"; return; }
    
    try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) document.getElementById("progStreak").innerText = profile.streak || 1;
        
        const { data: quizzes } = await supabase.from('quiz_results').select('*').eq('user_id', user.id);
        if (quizzes && quizzes.length > 0) {
            let acc = quizzes.reduce((sum, q) => sum + q.accuracy, 0) / quizzes.length;
            document.getElementById("progAccuracy").innerText = Math.round(acc) + "%";
        }
    } catch (err) { console.error("Progress load error:", err); }
}

// ===== PAGE SECURITY CHECK =====
window.onload = function() {
    const user = getCurrentUser();
    const page = window.location.pathname.split("/").pop();

    // Agar login/signup page par hai aur already logged in hai, toh dashboard bhej do
    if ((page === "login.html" || page === "signup.html") && user) {
        window.location.href = "dashboard.html";
        return;
    }

    // Agar protected page par hai aur login nahi hai, toh login page bhej do
    if (!user && !["index.html", "login.html", "signup.html", ""].includes(page)) {
        window.location.href = "login.html";
        return;
    }

    // Page specific functions run karo
    if (page === "dashboard.html") loadDashboard();
    if (page === "challenge.html") startQuiz();
    if (page === "progress.html") loadProgress();
};
