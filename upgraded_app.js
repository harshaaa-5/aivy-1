// --- Modern AIVY Dashboard JavaScript ---

// Application Data
const appData = {
  studentProfile: { name: "Student User", totalCourses: 4, activeAssignments: 8, studyHours: 32.5, performanceScore: 78 },
  courses: [
    { id: 1, name: "Machine Learning", progress: 72, strongTopics: ["Python Basics", "Data Preprocessing"], weakTopics: ["Neural Networks", "Deep Learning"], nextAssignment: "ML Project Report", deadline: "2025-09-28" },
    { id: 2, name: "Data Structures", progress: 85, strongTopics: ["Arrays", "Linked Lists", "Trees"], weakTopics: ["Graph Algorithms"], nextAssignment: "Graph Implementation", deadline: "2025-09-30" },
    { id: 3, name: "Database Systems", progress: 68, strongTopics: ["SQL Basics", "Normalization"], weakTopics: ["Query Optimization", "Indexing"], nextAssignment: "Database Design Project", deadline: "2025-10-05" },
    { id: 4, name: "Web Development", progress: 90, strongTopics: ["HTML", "CSS", "JavaScript", "React"], weakTopics: ["Node.js"], nextAssignment: "Full Stack Project", deadline: "2025-10-10" }
  ],
  assignments: [
    { id: 1, title: "ML Project Report", course: "Machine Learning", dueDate: "2025-09-28", priority: "high", status: "in-progress", estimatedHours: 8 },
    { id: 2, title: "Graph Implementation", course: "Data Structures", dueDate: "2025-09-30", priority: "medium", status: "not-started", estimatedHours: 6 },
    { id: 3, title: "SQL Query Practice", course: "Database Systems", dueDate: "2025-09-26", priority: "high", status: "completed", estimatedHours: 3 },
    { id: 4, title: "React Component Design", course: "Web Development", dueDate: "2025-09-29", priority: "medium", status: "in-progress", estimatedHours: 4 }
  ],
  performanceData: {
    overallTrend: [65, 68, 72, 75, 78, 82, 78],
    subjectPerformance: {
      "Machine Learning": 72,
      "Data Structures": 85,
      "Database Systems": 68,
      "Web Development": 90
    },
    knowledgeGaps: [
      { subject: "Machine Learning", topic: "Neural Networks", confidence: 45, recommendation: "Practice with TensorFlow tutorials" },
      { subject: "Machine Learning", topic: "Deep Learning", confidence: 38, recommendation: "Review fundamentals and work through examples" },
      { subject: "Database Systems", topic: "Query Optimization", confidence: 52, recommendation: "Study execution plans and indexing strategies" }
    ]
  }
};

// Chart instances
let progressChart = null;
let subjectChart = null;
let heatmapChart = null;
// Theme state
let currentTheme = "light";
let currentFilter = "all";

// On DOM loaded
window.addEventListener("DOMContentLoaded", function() {
  setTimeout(() => animateLanding(), 400);
  updateRealTimeClock();
  initializeNavigation();
  initializeCharts();
  renderTasks();
  renderKnowledgeGaps();
  initializeUrgentDeadlines();
  initializeSchedule();
  setupEventListeners();
  renderMiniPerformanceChart();
  setTimeout(() => {
    animateMetrics();
  }, 500);
});

// --- Modern Features --- //
// Landing Animation and Navigation
function animateLanding() {
  gsap.to("#landingScreen .logo-animation", {y: 0, opacity: 1, duration: 1.2});
}
function enterDashboard() {
  document.getElementById("landingScreen").classList.add("inactive");
  setTimeout(() => {
    document.getElementById("mainApp").style.display = "block";
  }, 300);
}

// Sidebar navigation
function navigateToSection(section) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.section === section) item.classList.add('active');
  });
  document.querySelectorAll('.content-section').forEach(sec => {
    sec.classList.remove('active');
  });
  document.getElementById(section).classList.add('active');
}
function initializeNavigation() { /* Already handled above */ }

// Theme toggle
function toggleTheme() {
  currentTheme = (currentTheme === "light") ? "dark" : "light";
  document.documentElement.setAttribute('data-theme', currentTheme);
}

// Real-Time updating metrics
function updateRealTimeClock() {
  const clockElem = document.getElementById('currentTime');
  if(clockElem) {
    setInterval(() => {
      const now = new Date();
      clockElem.textContent = now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    }, 1000);
  }
}

// Animate metrics
function animateMetrics() {
  // Animate metric numbers
  const metrics = [
    {id:'totalCourses', val: appData.studentProfile.totalCourses},
    {id:'activeAssignments', val: appData.studentProfile.activeAssignments},
    {id:'studyHours', val: appData.studentProfile.studyHours},
    {id:'performanceScore', val: appData.studentProfile.performanceScore}
  ];
  metrics.forEach(metric => {
    const el = document.getElementById(metric.id);
    if(el) animateNumber(el, metric.val);
  });
}
function animateNumber(elem, end) {
  let start = 0, duration = 1100, step = 12;
  let interval = setInterval(() => {
    start += (end/step);
    if(start >= end) {
      elem.textContent = (typeof end === 'number' ? end : end);
      clearInterval(interval);
    } else {
      elem.textContent = (typeof end === 'number' ? start.toFixed(0) : start.toFixed(1));
    }
  }, Math.floor(duration/step));
}

function renderMiniPerformanceChart() {
  const data = appData.performanceData.overallTrend;
  const canvas = document.createElement('canvas');
  canvas.width = 70; canvas.height = 24;
  document.getElementById('miniPerformanceChart').innerHTML = '';
  document.getElementById('miniPerformanceChart').appendChild(canvas);
  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: Array(data.length).fill(''), datasets:[{data, borderColor:'#1FB8CD',fill:false,pointRadius:0}] },
    options: { responsive:false, plugins:{legend:{display:false}}, scales:{y:{display:false},x:{display:false}}, animation:{duration:800} }
  });
}

// --- Chart Animation & Updates ---
function initializeCharts() {
  initializeProgressChart();
  initializeSubjectChart();
  initializeHeatmapChart();
}
function initializeProgressChart() {
  const ctx = document.getElementById('progressChart').getContext('2d');
  progressChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
      datasets: [{
        label: 'Performance Score',
        data: appData.performanceData.overallTrend,
        borderColor: '#1FB8CD',
        backgroundColor: 'rgba(31,184,205,0.11)',
        fill: true,
        tension: 0.42,
        pointBackgroundColor: '#FFC185',
        pointRadius: 7,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        animation:{duration:1100}
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing:'easeOutQuart' },
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 60, max: 100, grid:{color:'rgba(0,0,0,0.08)'} },
        x: { grid:{color:'rgba(0,0,0,0.08)'} }
      }
    }
  });
}
function initializeSubjectChart() {
  const subjects = Object.keys(appData.performanceData.subjectPerformance);
  const scores = Object.values(appData.performanceData.subjectPerformance);
  const ctx = document.getElementById('subjectChart').getContext('2d');
  subjectChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: subjects,
      datasets: [{
        data: scores,
        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#5D878F'],
        borderWidth:2,
        borderColor:'#fff',
        animation: { duration: 1400 }
      }]
    },
    options: {
      responsive:true,
      maintainAspectRatio: false,
      plugins: { legend:{position:'bottom',labels:{padding:18,usePointStyle:true}} },
      animation: { animateScale: true, duration: 1300 }
    }
  });
}
function initializeHeatmapChart() {
  const ctx = document.getElementById('heatmapChart').getContext('2d');
  const gaps = appData.performanceData.knowledgeGaps;
  heatmapChart = new Chart(ctx, {
    type:'bar',
    data:{
      labels:gaps.map(g=>g.topic),
      datasets:[{
        label:'Confidence Level',
        data:gaps.map(g=>g.confidence),
        backgroundColor:gaps.map(g=>g.confidence<40?'#B4413C':(g.confidence<60?'#FFC185':'#1FB8CD')),borderRadius:7
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      scales:{y:{beginAtZero:true,max:100},x:{}},plugins:{legend:{display:false}},animation:{duration:1100}
    }
  });
}

// --- Tasks Section Rendering ---
function filterTasks(type) {
  currentFilter = type;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if(btn.dataset.filter===type) btn.classList.add('active');
  });
  renderTasks();
}
function renderTasks() {
  const container = document.getElementById('tasksContainer');
  let filtered = appData.assignments;
  if(currentFilter!=='all') filtered = (currentFilter==='completed')
    ? filtered.filter(t=>t.status==='completed')
    : filtered.filter(t=>t.priority===currentFilter);
  container.innerHTML = filtered.map(task => renderTaskCard(task)).join('');
}
function renderTaskCard(task) {
  return `<div class="task-card">
    <div class="task-header">
      <h3 class="task-title">${task.title}</h3>
      <span class="task-priority ${task.priority}">${task.priority.charAt(0).toUpperCase()+task.priority.slice(1)}</span>
    </div>
    <div class="task-course">${task.course}</div>
    <div class="task-meta">
      <span class="task-status"><span class="status-indicator ${task.status}"></span>${task.status.replace('-',' ')}</span>
      <span class="date">Due: ${task.dueDate}</span>
      <span>${task.estimatedHours}h</span>
    </div>
  </div>`;
}

// --- Urgent Deadlines ---
function initializeUrgentDeadlines() {
  const now = new Date();
  const urgent = appData.assignments.filter(a => {
    let dd = new Date(a.dueDate);
    return (dd - now) < (48*60*60*1000) && a.status!=='completed';
  });
  const container = document.getElementById('urgentDeadlines');
  container.innerHTML = urgent.length ? urgent.map(a => renderDeadlineItem(a)).join('') : '<div class="no-deadlines">No urgent deadlines!</div>';
}
function renderDeadlineItem(a) {
  let priorityClass = a.priority === 'high' ? 'high-priority' : 'medium-priority';
  let timeLeft = getCountdown(a.dueDate);
  return `<div class="deadline-item ${priorityClass}">
    <div class="deadline-info">
      <h4>${a.title}</h4>
      <p>${a.course}</p>
    </div>
    <div class="deadline-date">
      <span class="date">${timeLeft}</span>
      <span class="priority">${a.priority.charAt(0).toUpperCase()+a.priority.slice(1)}</span>
    </div>
  </div>`;
}
function getCountdown(dateStr) {
  let now=new Date(), target=new Date(dateStr);
  let diff=Math.max(0, target-now), d=Math.floor(diff/(24*3600*1000)), h=Math.floor((diff%(24*3600*1000))/(3600*1000));
  if(d>0) return `${d} days ${h} hrs left`;
  if(h>0) return `${h} hrs left`;
  if(diff>0) return `${Math.floor(diff/60000)} min left`;
  return "Past due";
}

// --- Analytics Section ---
function renderKnowledgeGaps() {
  const container = document.getElementById('knowledgeGaps');
  const gaps = appData.performanceData.knowledgeGaps;
  container.innerHTML = gaps.map(gap => `
    <div class="gap-item ${gap.confidence<40?'weak':gap.confidence<60?'moderate':''}">
      <div class="gap-header">
        <span class="gap-topic">${gap.subject}: ${gap.topic}</span>
        <span class="confidence-score">${gap.confidence}%</span>
      </div>
      <div class="gap-recommendation">${gap.recommendation}</div>
    </div>
  `).join('');
}

// --- Schedule Section ---
function initializeSchedule() {
  const weeks = [
    {day:"Today - Sep 22",events:[{"time":"2:00 PM","topic":"Neural Networks","hours":2},{"time":"4:30 PM","topic":"Query Optimization","hours":1.5}]},
    {day:"Tomorrow - Sep 23",events:[{"time":"10:00 AM","topic":"Graph Algorithms","hours":3},{"time":"3:00 PM","topic":"Node.js","hours":2}]}
  ];
  const container = document.getElementById('weeklySchedule');
  container.innerHTML = weeks.map(w => `<div class="schedule-day"><h4>${w.day}</h4>${w.events.map(e => `<div class="schedule-event"><span class="event-time">${e.time}</span> <span class="event-topic">${e.topic}</span> <span class="event-hours">${e.hours}h</span></div>`).join('')}</div>`).join('');
}

// --- Voice Assistant Feature ---
let synth = window.speechSynthesis;
function toggleVoiceAssistant() {
  document.getElementById('voiceModal').classList.toggle('active');
  if(document.getElementById('voiceModal').classList.contains('active')) document.getElementById('voiceStatus').textContent = "Listening...";
}
function closeVoiceModal() {
  document.getElementById('voiceModal').classList.remove('active');
}
function askVoiceQuestion(question) {
  document.getElementById('voiceTranscript').textContent = question;
  speakText("Here's the answer for: " + question);
  // Simulate real functionality
  document.getElementById('voiceStatus').textContent = "Answered";
}
function speakText(text) {
  if(!synth) return;
  let msg = new SpeechSynthesisUtterance(text);
  msg.rate = 1.02;
  msg.pitch = 1.03;
  synth.speak(msg);
}

// --- AI Assistant Section: Chat & Actions ---
function sendMessage() {
  let input = document.getElementById('chatInput').value.trim();
  if(!input) return;
  addMessage('user', input);
  setTimeout(()=>{
    addMessage('ai',getAIResponse(input));
    speakText(getAIResponse(input));
  },800);
  document.getElementById('chatInput').value = '';
}
function addMessage(role, text) {
  let container = document.getElementById('chatMessages');
  let msgHtml = `<div class="message ${role}-message">
                  <div class="message-avatar"><i class="fas fa-${role==='ai'?'robot':'user'}"></i></div>
                  <div class="message-content"><p>${text}</p></div>
                </div>`;
  container.innerHTML += msgHtml;
  container.scrollTop = container.scrollHeight;
}
function getAIResponse(input) {
  input = input.toLowerCase();
  if(input.includes('deadlines')) return 'Your upcoming deadlines: ML Project Report (1 day), Graph Implementation (3 days).';
  if(input.includes('study plan')) return 'Recommended: Focus on Neural Networks, Database Optimization. Study 2 hours daily.';
  if(input.includes('performance')) return 'Current performance: Python 80%, WebDev 90%, DB 68%. Review weaker topics for improvement.';
  if(input.includes('resources')) return 'Great resources: TensorFlow Tutorials, GeeksforGeeks DB Guide.';
  return 'I can help with deadlines, study plans, performance insights. Try asking!';
}
function quickAction(type) {
  let msg = '';
  if(type==='study-plan') msg = 'Here is a study plan for this week: Neural Networks (2h), Graph Algorithms (3h), Node.js (2h).';
  if(type==='practice-quiz') msg = 'Practice Quiz: 10 questions on ML basics and DB Optimization.';
  if(type==='performance') msg = 'Performance breakdown: ML - 72%, DB - 68%, Webdev - 90%. Focus on ML fundamentals.';
  if(type==='resources') msg = 'Check out: Coursera ML, DB Management by Stanford.';
  addMessage('ai',msg);
  speakText(msg);
}
function startVoiceInput() {
  toggleVoiceAssistant();
}

// --- Notification and Loading Overlay ---
function showNotifications() {
  document.getElementById('notificationPanel').classList.add('active');
}
function closeNotifications() {
  document.getElementById('notificationPanel').classList.remove('active');
}
function toggleSetting(el) {
  el.classList.toggle('active');
}

// --- Utility / Event Listeners ---
function setupEventListeners() {
  document.querySelectorAll('.theme-toggle').forEach(btn=>btn.addEventListener('click',toggleTheme));
  document.querySelectorAll('.nav-item').forEach(nav=>{
    nav.addEventListener('mouseover', e=>nav.querySelector('.nav-tooltip').style.display='block');
    nav.addEventListener('mouseout', e=>nav.querySelector('.nav-tooltip').style.display='none');
  });
  document.getElementById('sendBtn').addEventListener('click',sendMessage);
  document.getElementById('voiceBtn').addEventListener('click',startVoiceInput);
}

// --- END JS ---
