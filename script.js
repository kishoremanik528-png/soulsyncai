/* ============================================
   SoulSync AI — Main Application Logic
   ============================================ */

// ---- Constants & Config ----
const APP_NAME = "SoulSync AI";
const STORAGE_KEYS = {
    theme: 'soulsync-theme',
    moods: 'soulsync-moods',
    chatHistory: 'soulsync-chat',
    chatArchive: 'soulsync-chat-archive',
    userName: 'soulsync-username',
    userPhoto: 'soulsync-userphoto',
    userStatus: 'soulsync-userstatus',
    userAvatar: 'soulsync-useravatar',
    aiName: 'soulsync-ainame',
    voiceURI: 'soulsync-voiceuri'
};

// Default AI name
const DEFAULT_AI_NAME = "SoulSync AI";

// Get the current AI name (custom or default)
function getAIName() {
    return localStorage.getItem(STORAGE_KEYS.aiName) || DEFAULT_AI_NAME;
}

// Update all places that show the AI name
function updateAINameDisplay() {
    const aiName = getAIName();
    const headerName = $('.header-name');
    if (headerName) headerName.textContent = aiName;
    const logoText = $('.logo-text');
    if (logoText) {
        if (aiName === DEFAULT_AI_NAME) {
            logoText.innerHTML = 'SoulSync<span>AI</span>';
        } else {
            logoText.textContent = aiName;
        }
    }
}

// ---- DOM Elements ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const splashScreen = $('#splashScreen');
const appContainer = $('#appContainer');
const chatMessages = $('#chatMessages');
const chatInput = $('#chatInput');
const sendBtn = $('#sendBtn');
const emojiBtn = $('#emojiBtn');
const emojiPicker = $('#emojiPicker');
const quickReplies = $('#quickReplies');
const menuBtn = $('#menuBtn');
const sidebar = $('#sidebar');
const sidebarOverlay = $('#sidebarOverlay');
const sidebarClose = $('#sidebarClose');
const themeToggle = $('#themeToggle');

// ---- State ----
let conversationState = {
    step: 0,        // tracks intro flow
    name: '',
    askedFood: false,
    askedMood: false,
    detectedMood: 'neutral',
    messageCount: 0
};

// ---- Chat History Functions ----
function saveChatMessage(text, type, time) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.chatHistory) || '[]');
    history.push({ text, type, time: time || getTimeString(), timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEYS.chatHistory, JSON.stringify(history));
}

function getChatHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.chatHistory) || '[]');
}

function clearCurrentChat() {
    localStorage.removeItem(STORAGE_KEYS.chatHistory);
}

function archiveCurrentChat() {
    const currentChat = getChatHistory();
    if (currentChat.length === 0) return;

    const archives = JSON.parse(localStorage.getItem(STORAGE_KEYS.chatArchive) || '[]');
    const firstMsg = currentChat[0];
    const lastMsg = currentChat[currentChat.length - 1];

    // Create a preview from the first user message or first AI message
    const userMsg = currentChat.find(m => m.type === 'user');
    const preview = userMsg ? userMsg.text.substring(0, 50) : currentChat[0].text.substring(0, 50);

    archives.push({
        id: Date.now(),
        messages: currentChat,
        preview: preview + (preview.length >= 50 ? '...' : ''),
        date: new Date(firstMsg.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: firstMsg.time,
        messageCount: currentChat.length
    });

    // Keep last 20 archives
    if (archives.length > 20) archives.shift();
    localStorage.setItem(STORAGE_KEYS.chatArchive, JSON.stringify(archives));
    clearCurrentChat();
}

function getChatArchives() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.chatArchive) || '[]');
}

function loadArchivedChat(archiveId) {
    const archives = getChatArchives();
    return archives.find(a => a.id === archiveId);
}

function restoreChatHistory() {
    const history = getChatHistory();
    if (history.length === 0) return false;

    // Restore messages without typing animation
    history.forEach(msg => {
        const el = createMessageElement(msg.text, msg.type, msg.time);
        chatMessages.appendChild(el);
    });

    scrollToBottom();
    return true;
}

// ---- Utility Functions ----
function getTimeString() {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getDateString() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-IN', options);
}

function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ---- Splash Screen ----
function initSplash() {
    // Create floating particles
    const particlesContainer = $('#splashParticles');
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'splash-particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = (60 + Math.random() * 40) + '%';
        p.style.animationDelay = Math.random() * 4 + 's';
        p.style.animationDuration = (4 + Math.random() * 4) + 's';
        p.style.width = p.style.height = (4 + Math.random() * 6) + 'px';
        particlesContainer.appendChild(p);
    }

    // Auto dismiss splash after 2.5s
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        appContainer.classList.add('visible');

        // Start the conversation after a beat
        setTimeout(() => startConversation(), 500);

        // Remove splash from DOM after animation
        setTimeout(() => splashScreen.remove(), 1000);
    }, 2500);
}

// ---- Theme ----
function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        $('.theme-icon').textContent = '☀️';
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        $('.theme-icon').textContent = '🌙';
        localStorage.setItem(STORAGE_KEYS.theme, 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        $('.theme-icon').textContent = '☀️';
        localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    }
}

// ---- Date Display ----
function updateDateDisplay() {
    $('#chatDate').textContent = getDateString();
}

// ---- Message Rendering ----
function createMessageElement(text, type = 'ai', time = null) {
    const msg = document.createElement('div');
    msg.className = `message ${type}`;

    const timeStr = time || getTimeString();

    if (type === 'ai') {
        // Escaping single quotes and double quotes for the onclick handlers
        const safeText = text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        msg.innerHTML = `
            <div class="message-avatar">
                <img src="avatar.png" alt="SoulSync AI">
            </div>
            <div>
                <div class="message-bubble">
                    ${text}
                    <div class="message-actions">
                        <button class="action-btn" onclick="speakText('${safeText}')" title="Play Voice">🔊</button>
                        <button class="action-btn" onclick="copyText('${safeText}', this)" title="Copy">📋</button>
                        <button class="action-btn" onclick="shareText('${safeText}')" title="Share">📤</button>
                    </div>
                </div>
                <div class="message-time">${timeStr}</div>
            </div>
        `;
    } else {
        msg.innerHTML = `
            <div>
                <div class="message-bubble">${text}</div>
                <div class="message-time">${timeStr}</div>
            </div>
        `;
    }

    return msg;
}

function addMessage(text, type = 'ai', withTyping = true, skipSave = false) {
    return new Promise(async (resolve) => {
        if (type === 'ai' && withTyping) {
            const typing = showTypingIndicator();
            const typingDelay = Math.min(800 + text.length * 15, 2000);
            await delay(typingDelay);
            typing.remove();
        }

        const time = getTimeString();
        const msg = createMessageElement(text, type, time);
        chatMessages.appendChild(msg);
        scrollToBottom();

        // Save to chat history
        if (!skipSave) {
            saveChatMessage(text, type, time);
        }

        resolve();
    });
}

function showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.id = 'typingIndicator';
    typing.innerHTML = `
        <div class="message-avatar">
            <img src="avatar.png" alt="${getAIName()}">
        </div>
        <div class="typing-bubble">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatMessages.appendChild(typing);
    scrollToBottom();
    return typing;
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ---- Conversation Engine ----

// Greeting messages based on time of day
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return randomChoice([
        "Good morning da! ☀️ Eppdi irukkka?",
        "Kaalaila vandhutten! ☀️ Nalla thoonginiya?",
        "Morning da! 🌅 Edhu nalla start panniyaachaa inniki?"
    ]);
    if (hour < 17) return randomChoice([
        "Hey da! 🌤 Afternoon la enna panra?",
        "Maathiyaanam pochu da! Lunch saptiya? 🍛",
        "Yo! 👋 Eppdi poguthu inniki?"
    ]);
    if (hour < 21) return randomChoice([
        "Evening da! 🌆 Inniki eppdi pochu?",
        "Hey! 🌇 Day eppdi da? Tired ah irukka?",
        "Vaanga vaanga! 🌆 Evlo vela achu inniki?"
    ]);
    return randomChoice([
        "Dei night la kuda thoonama irukka? 🌙",
        "Enna da night owl ah? 🦉 Thookkam varaliya?",
        "Late night ah! 🌙 Enna panra ippo?"
    ]);
}

async function startConversation() {
    updateDateDisplay();
    updateAINameDisplay();

    const savedName = localStorage.getItem(STORAGE_KEYS.userName);

    // Try to restore previous chat history
    const hasHistory = restoreChatHistory();
    if (hasHistory) {
        // Restore conversation state
        if (savedName) {
            conversationState.name = savedName;
            conversationState.step = 2;
        }
        quickReplies.style.display = 'none';
        return; // Chat restored, no need to start fresh
    }

    if (savedName) {
        conversationState.name = savedName;
        conversationState.step = 2;
        await addMessage(getGreeting());
        await delay(400);
        await addMessage(`${savedName}, innaiku eppdi feel panra? 😊`);
    } else {
        const aiName = getAIName();
        await addMessage(`Hey! 👋 Naan ${aiName} — un best friend maari! 💜`);
        await delay(300);
        await addMessage("Unna enna nu koopidalaam? Un peru enna da? 😊");
        conversationState.step = 1;
    }
}

// Mood detection from text
function detectMood(text) {
    const lower = text.toLowerCase();

    const sadWords = ['sad', 'upset', 'cry', 'crying', 'depressed', 'lonely', 'alone', 'hurt', 'pain', 'bad', 'worst', 'terrible', 'horrible',
        'kaduppu', 'kashtam', 'azhugiren', 'azhuven', 'dukkham', 'valikkudhu', 'nalla illa', 'nallailla',
        'sad ah', 'sadah', 'feel bad', 'low', 'down', 'broken', 'valikarathu', 'stress', 'tension',
        'valikudhu', 'bore', 'bored', 'boring', 'thani', 'thaniya', 'miss', 'confused'];

    const happyWords = ['happy', 'good', 'great', 'awesome', 'amazing', 'wonderful', 'fantastic', 'love',
        'nalla', 'super', 'semma', 'theri', 'mass', 'jolly', 'fun', 'enjoy', 'excited',
        'nallairukken', 'santosham', 'kondattam', 'well', 'fine', 'ok', 'okay', 'nice', 'cool',
        'perfect', 'best', 'excellent', 'vera level', 'romba nalla'];

    const stressWords = ['stressed', 'anxious', 'anxiety', 'nervous', 'worried', 'pressure', 'panic',
        'tension', 'bayam', 'paravala', 'korikkam', 'overthinking', 'overthink', 'scared',
        'exam', 'work pressure', 'deadline'];

    const angryWords = ['angry', 'furious', 'mad', 'irritated', 'annoyed', 'frustrated', 'hate',
        'kovam', 'erichal', 'aaathiram', 'kaduppu'];

    for (const w of sadWords) { if (lower.includes(w)) return 'sad'; }
    for (const w of stressWords) { if (lower.includes(w)) return 'stressed'; }
    for (const w of angryWords) { if (lower.includes(w)) return 'angry'; }
    for (const w of happyWords) { if (lower.includes(w)) return 'happy'; }

    return 'neutral';
}

// Food-related detection
function detectFoodMention(text) {
    const lower = text.toLowerCase();
    const foodWords = ['ate', 'eaten', 'food', 'lunch', 'dinner', 'breakfast', 'snack', 'biryani',
        'sapten', 'saptachu', 'saptiya', 'saptu', 'sapta', 'saapitten', 'saaptu', 'saapten',
        'rice', 'dosa', 'idly', 'chapathi', 'meals', 'tiffin', 'tea', 'coffee', 'cappuccino',
        'yes', 'aama', 'aamaa', 'sapitten', 'hungry', 'starving'];

    const notEatenWords = ['no', 'illa', 'saapala', 'sapatilla', 'haven\'t eaten', 'not yet',
        'skip', 'skipped', 'sapala', 'illapa', 'empty stomach'];

    for (const w of notEatenWords) { if (lower.includes(w)) return 'not_eaten'; }
    for (const w of foodWords) { if (lower.includes(w)) return 'eaten'; }

    return null;
}

// ---- Language Detection ----
function isTelugu(text) {
    const lower = text.toLowerCase().trim();
    const teluguWords = [
        'ela', 'unnavu', 'bagunnanu', 'em', 'chestunnav', 'akkada', 'ikkada',
        'avunu', 'kadu', 'ledu', 'bhojanam', 'cheshava', 'cheyaledu',
        'namaskaram', 'andi', 'chala', 'kuda', 'vachindi', 'vastundi', 'telugu'
    ];

    // Check for Tenglish words
    const words = lower.replace(/[^a-z\s]/g, '').split(/\s+/);
    for (const word of words) {
        if (teluguWords.includes(word)) return true;
    }

    // Check for Telugu Unicode characters
    if (/[\u0C00-\u0C7F]/.test(text)) return true;

    return false;
}

function isEnglish(text) {
    const lower = text.toLowerCase().trim();

    // Common Tamil/Tanglish keywords that indicate non-English
    const tamilWords = [
        'da', 'di', 'pa', 'ma', 'bro', 'macha', 'machan', 'thala',
        'naan', 'nee', 'enna', 'eppo', 'eppdi', 'enga', 'inga',
        'illa', 'aama', 'seri', 'saptiya', 'saptu', 'sapta', 'sapten',
        'saapitten', 'saaptu', 'saapten', 'saapala', 'sapatilla',
        'iruken', 'irukken', 'irukkiya', 'iruku', 'irukku',
        'pannren', 'panren', 'panra', 'pannuven', 'pannalam',
        'vaanga', 'vaa', 'poda', 'podi', 'pogalaam',
        'nalla', 'nallailla', 'nallairukken', 'romba', 'konjam',
        'thoongu', 'thookkam', 'thoonginiya',
        'kovam', 'kaduppu', 'erichal', 'aaathiram',
        'kashtam', 'azhugiren', 'dukkham', 'valikkudhu', 'valikudhu',
        'santosham', 'kondattam', 'semma', 'theri', 'mass',
        'sollu', 'kekiren', 'paaru', 'paarunga',
        'innaiku', 'inniki', 'naalaiku', 'nethu',
        'sapdu', 'kudichidu', 'tiffin', 'saaptiya',
        'bayam', 'paravala', 'thaniya', 'thani',
        'vera level', 'adipavi', 'dei', 'dai'
    ];

    // Check if text contains Tamil/Tanglish words
    const words = lower.replace(/[^a-z\s]/g, '').split(/\s+/);
    for (const word of words) {
        if (tamilWords.includes(word)) return false;
    }

    // Check for Tamil Unicode characters
    if (/[\u0B80-\u0BFF]/.test(text)) return false;

    // Check for Telugu (route to Telugu logic instead)
    if (isTelugu(text)) return false;

    return true;
}

// ---- Gemini API Call ----
async function getGeminiResponse(userText) {
    try {
        const apiUrl = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
            ? 'http://127.0.0.1:5000/chat' 
            : '/chat';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText, name: conversationState.name, aiName: getAIName() })
        });

        if (!response.ok) throw new Error('Server error');

        const data = await response.json();
        return data.reply;
    } catch (error) {
        console.error('Gemini API error:', error);
        // Fallback English replies if API fails
        return randomChoice([
            `I hear you, ${conversationState.name}! Tell me more about that 😊`,
            `That's interesting! How does that make you feel? 💛`,
            `I'm here for you! What else is on your mind? 🤗`,
            `Thanks for sharing that with me. Want to talk more about it? 💜`
        ]);
    }
}

// ---- Response Generator (for Tanglish) ----
function generateResponse(userText) {
    const mood = detectMood(userText);
    const food = detectFoodMention(userText);
    conversationState.detectedMood = mood;
    conversationState.messageCount++;

    // Step 1: Getting user's name
    if (conversationState.step === 1) {
        const name = userText.trim().split(' ')[0];
        conversationState.name = name.charAt(0).toUpperCase() + name.slice(1);
        conversationState.step = 2;
        localStorage.setItem(STORAGE_KEYS.userName, conversationState.name);

        return [
            `${conversationState.name}! 🥰 Romba nalla peru da!`,
            `Seri ${conversationState.name}, innaiku eppdi feel panra? Nalla irukkiya? 😊`
        ];
    }

    // Food responses
    if (food === 'eaten') {
        conversationState.askedFood = true;
        saveMood('happy');
        return [randomChoice([
            "Nalla saapta! 🍛 Enna sapta? Taste ah irundhucha? 😋",
            "Semma! Food illaama health illa da 💪 Enna sapta sollu!",
            "Good good! 🍽 Saapdalaam nu ninachaalum skip panlaam... enna sapta? 😄",
            "Adipavi! 🎉 Full meals ah? Light ah? Sollu sollu!"
        ])];
    }

    if (food === 'not_eaten') {
        conversationState.askedFood = true;
        return [randomChoice([
            "Dei! 😤 Enna da, saapala?! Udane poi sapdu! Health first da!",
            "Ayyoo 😟 Saapala na eppdi da? Poi enna aavadhu sapdu please 🙏",
            "No no no! 😤 Skip pannatha da food ah. Udane sapdu, naan wait panren!",
            "Illaye?! 😱 Dei, un stomach ku kooda oru think pannu. Go eat now! 🍛"
        ])];
    }

    // Mood-based responses
    if (mood === 'sad') {
        saveMood('sad');
        return [randomChoice([
            `Hey ${conversationState.name}... 🤗 Naan iruken da un kooda. Enna aachu? Sollu...`,
            `Ada paavam 😢 Enna aachu da? Kavalai padatha, naan iruken. Sollu, kekiren...`,
            `${conversationState.name}... 💜 Sad ah feel panra na, it's okay da. Enna matter nu sollu, pesalaam.`,
            `Dei, nee sad ah iruntha enaku romba kashtam da 😔 Enna aachu? Sollu, I'm here for you...`
        ]), randomChoice([
            "Remember da, idhuvum kadandhu pogum 💛 Nee strong da!",
            "Konjam time edukkum, but nee okay aaiduva 💪 Trust the process da.",
            "Enna enna aanalum, I'm always here for you 💜 Don't forget that."
        ])];
    }

    if (mood === 'stressed') {
        saveMood('stressed');
        return [randomChoice([
            `Stress ah da ${conversationState.name}? 😰 Oru deep breath edu... Inhale... Exhale... 🧘`,
            `Ada tension padatha da! 💆 Oru 5 mins relax pannu. Close your eyes and breathe...`,
            `Stress varum pogum da, but un health pogaathu 💚 Konjam rest edu. Enna stress aachu?`,
            `Hey hey, tension ah? 😟 Sollu da enna matter... sometimes sharing helps a lot 💛`
        ])];
    }

    if (mood === 'angry') {
        saveMood('stressed');
        return [randomChoice([
            `Kovama da? 😤 Okay okay, calm down... Enna aachu nu sollu first...`,
            `Ayyoo! 😳 Yaaru da un kitta kovam varumaru pannadhu? Sollu I'll listen...`,
            `${conversationState.name}, breathe da breathe 🌬 Kovathula wrong decisions edukkaatha. What happened?`,
            `Erichal ah da? 😮 Okay, let it out. Sollu enna aachu — naan judge pannama kekiren 🤗`
        ])];
    }

    if (mood === 'happy') {
        saveMood('happy');
        return [randomChoice([
            `Yaaay! 🎉 Nee happy ah na naan double happy da! Enna special today?`,
            `That's the spirit da ${conversationState.name}! 🔥 Semma! Enna nalla nadandhuchu?`,
            `Vera level! 🥰 Un smile ah imagine pannene, feels good da!`,
            `Semma da! 💛 Un happy vibes enakum varudhu! Keep it up! Enna panra ippo?`,
            `Mass da! 🔥 Inniki un day! Keep shining ✨`
        ])];
    }

    // Periodic food check (every 4-5 messages)
    if (!conversationState.askedFood && conversationState.messageCount % 4 === 0) {
        conversationState.askedFood = true;
        return [randomChoice([
            "Wait wait... oru important question ✋ Saptiya da?? 🍛",
            "Moment moment... nee saaptu irukkiyaa illaya? 🤔🍛",
            "Dei oru vishayam... food saptu aachaa? Skip pannatha ha! 🍽",
            "Apram enna, saptiya illa ragging pannuva? 😤🍛"
        ])];
    }

    // General/neutral conversation responses
    const generalResponses = [
        [
            `Sollu sollu ${conversationState.name}! 😊 Innaiku enna plan?`,
        ],
        [
            `Hmm 🤔 Interesting da! Vera enna updates? Edhaavadhu exciting nadandhucha?`,
        ],
        [
            randomChoice([
                `Seri seri 😄 Innaiku mood eppdi? Like... overall feel?`,
                `Cool cool! 😎 Vera enna da scene un life la? Sollu...`,
                `Haha okayy 😄 Nee enna panra next? Any plans?`,
                `That's nice da! 💛 Life la small things matter pannum, enjoy pannda!`,
                `Apram? 😊 Continue pannu, I'm listening... nee pesa naan kekiren!`,
                `Seri ${conversationState.name}! 😁 I'm always curious about un day. Vera updates?`,
                `Dei, sometimes nothing special panradhum oru vibe dhan! 😌 Just chill pannu!`
            ])
        ]
    ];

    // Reset food ask periodically
    if (conversationState.messageCount % 6 === 0) {
        conversationState.askedFood = false;
    }

    return randomChoice(generalResponses);
}

// ---- Voice Output (Web Speech API) ----
function speakText(text) {
    if ('speechSynthesis' in window) {
        // More robust emoji and symbol removal
        const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
        if (!cleanText) return;

        window.speechSynthesis.cancel(); // Stop currently playing audio

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;

        const voices = window.speechSynthesis.getVoices();
        let preferredVoice;

        // Check if user has a preferred voice selected
        const savedVoiceURI = localStorage.getItem(STORAGE_KEYS.voiceURI);
        if (savedVoiceURI && savedVoiceURI !== 'default') {
            const selectedVoice = voices.find(v => v.voiceURI === savedVoiceURI);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                window.speechSynthesis.speak(utterance);
                return;
            }
        }

        // Check language to select the best accent (fallback)
        if (isEnglish(cleanText)) {
            // For pure English: Find US/UK fluent voices
            preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('en')) ||
                voices.find(v => v.lang.includes('en') && (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Aria'))) ||
                voices.find(v => v.lang.includes('en-US') || v.lang.includes('en-GB'));
        } else if (isTelugu(cleanText)) {
            // For Telugu/Tenglish: Find Telugu (te-IN) or Indian English
            preferredVoice = voices.find(v => v.lang === 'te-IN') ||
                voices.find(v => v.lang === 'en-IN') ||
                voices.find(v => v.name.includes('India') || v.lang.includes('en-IN')) ||
                voices.find(v => v.lang.includes('en'));
        } else {
            // For Tanglish/Tamil: Find Indian English (en-IN) or Tamil (ta-IN)
            preferredVoice = voices.find(v => v.lang === 'ta-IN') ||
                voices.find(v => v.lang === 'en-IN') ||
                voices.find(v => v.name.includes('India') || v.lang.includes('en-IN')) ||
                voices.find(v => v.lang.includes('en'));
        }

        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    }
}

// ---- Copy & Share ----
function copyText(text, btnElement) {
    // Write text to clipboard
    navigator.clipboard.writeText(text).then(() => {
        const originalIcon = btnElement.innerHTML;
        btnElement.innerHTML = '✅'; // Show success checkmark
        setTimeout(() => {
            btnElement.innerHTML = originalIcon; // Revert back after 2s
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Copy failed! Your browser might not support it.');
    });
}

function shareText(text) {
    // Check if Web Share API is supported (works mostly on mobile and some modern desktop browsers)
    if (navigator.share) {
        navigator.share({
            title: 'SoulSync AI',
            text: text
        }).catch(console.error);
    } else {
        // Fallback for desktop browsers that don't support Share API
        copyText(text, { innerHTML: '' }); // Just copy it
        alert('Text copied to clipboard to share! 📋');
    }
}

// ---- Send Message Flow ----
async function sendMessage(text) {
    if (!text.trim()) return;

    // Hide quick replies after first use
    quickReplies.style.display = 'none';

    // Add user message
    await addMessage(text, 'user', false);

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Check if we're still in the name-asking step (step 1) — always use local
    if (conversationState.step === 1) {
        const responses = generateResponse(text);
        for (const resp of responses) {
            await addMessage(resp, 'ai', true);
            await delay(200);
        }
        return;
    }

    // Detect language and route accordingly
    if (isEnglish(text) || isTelugu(text)) {
        // English/Telugu message → call Gemini API for natural response
        const typing = showTypingIndicator();
        const reply = await getGeminiResponse(text);
        typing.remove();

        // Detect mood from English/Telugu text
        const mood = detectMood(text);
        if (mood !== 'neutral') saveMood(mood);

        await addMessage(reply, 'ai', false);
    } else {
        // Tanglish/Tamil message → use local response engine
        const responses = generateResponse(text);
        for (const resp of responses) {
            await addMessage(resp, 'ai', true);
            await delay(200);
        }
    }
}

// ---- Mood Tracking ----
function saveMood(mood) {
    const moods = JSON.parse(localStorage.getItem(STORAGE_KEYS.moods) || '[]');
    moods.push({
        mood,
        timestamp: Date.now(),
        date: new Date().toLocaleDateString()
    });
    // Keep last 50 entries
    if (moods.length > 50) moods.shift();
    localStorage.setItem(STORAGE_KEYS.moods, JSON.stringify(moods));
}

function renderMoodTracker() {
    const moods = JSON.parse(localStorage.getItem(STORAGE_KEYS.moods) || '[]');
    const moodChart = $('#moodChart');
    const moodHistory = $('#moodHistory');

    if (moods.length === 0) {
        moodChart.innerHTML = '<p class="mood-empty">No mood data yet! Keep chatting and I\'ll track your vibes 🎵</p>';
        moodHistory.innerHTML = '';
        return;
    }

    // Count moods
    const counts = { happy: 0, okay: 0, sad: 0, stressed: 0, loved: 0 };
    moods.forEach(m => {
        if (m.mood === 'angry') counts.stressed++;
        else if (counts[m.mood] !== undefined) counts[m.mood]++;
    });

    const max = Math.max(...Object.values(counts), 1);
    const moodLabels = {
        happy: '😊', okay: '😐', sad: '😢', stressed: '😰', loved: '🥰'
    };

    moodChart.innerHTML = `
        <div class="mood-bar-chart">
            ${Object.entries(counts).map(([mood, count]) => `
                <div class="mood-bar-item">
                    <div class="mood-bar ${mood}" style="height: ${(count / max) * 80 + 10}px"></div>
                    <span class="mood-bar-label">${moodLabels[mood]}</span>
                </div>
            `).join('')}
        </div>
    `;

    // Recent entries
    const recent = moods.slice(-5).reverse();
    moodHistory.innerHTML = recent.map(m => {
        const emoji = moodLabels[m.mood] || moodLabels['okay'];
        const time = new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        return `
            <div class="mood-entry">
                <span class="mood-entry-emoji">${emoji}</span>
                <span class="mood-entry-text">${m.mood.charAt(0).toUpperCase() + m.mood.slice(1)}</span>
                <span class="mood-entry-time">${m.date} ${time}</span>
            </div>
        `;
    }).join('');
}

// ---- Self Care Tips ----
function renderSelfCare() {
    const tips = [
        { icon: '🧘', title: 'Deep Breathing', desc: '4 seconds inhale, 7 seconds hold, 8 seconds exhale. Repeat 3 times. Calmness guaranteed! 🌬' },
        { icon: '💧', title: 'Drink Water', desc: 'Dehydration makes you tired and unfocused. Oru glass thanni kudichidu right now! 💦' },
        { icon: '🚶', title: '5-Minute Walk', desc: 'Just walk around for 5 minutes. Fresh air and movement work wonders for your mood! 🌿' },
        { icon: '🎵', title: 'Listen to Music', desc: 'Put on your favorite song and just vibe for a bit. Music is therapy da! 🎶' },
        { icon: '📱', title: 'Digital Detox', desc: 'Keep your phone away for 30 minutes. Read something, or just sit quietly. Peace guaranteed! 🧘' },
        { icon: '😴', title: 'Power Nap', desc: '20-minute power nap. Not more, not less. You\'ll wake up refreshed! 💤' },
        { icon: '✍️', title: 'Journal It Out', desc: 'Write down 3 things you\'re grateful for today. Perspective shift pannudhu! 📝' },
        { icon: '🤗', title: 'Reach Out', desc: 'Call or text someone you love. Connection is the best medicine for loneliness 💛' }
    ];

    $('#selfCareCards').innerHTML = tips.map(tip => `
        <div class="self-care-card">
            <h3>${tip.icon} ${tip.title}</h3>
            <p>${tip.desc}</p>
        </div>
    `).join('');
}

// ---- Event Listeners ----
function initEvents() {
    // Send message
    sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(chatInput.value);
        }
    });

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    // Quick replies
    $$('.quick-reply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sendMessage(btn.dataset.msg);
        });
    });

    // Emoji picker
    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle('open');
    });

    $$('.ep-emoji').forEach(btn => {
        btn.addEventListener('click', () => {
            chatInput.value += btn.textContent;
            chatInput.focus();
            emojiPicker.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
            emojiPicker.classList.remove('open');
        }
    });

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Sidebar
    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
    });

    sidebarClose.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    }

    // Sidebar nav
    $('#navNewChat').addEventListener('click', () => {
        closeSidebar();
        // Archive current chat before starting new one
        archiveCurrentChat();
        // Reset conversation
        chatMessages.innerHTML = `<div class="date-divider"><span id="chatDate">${getDateString()}</span></div>`;
        conversationState = { step: 0, name: conversationState.name, askedFood: false, askedMood: false, detectedMood: 'neutral', messageCount: 0 };
        quickReplies.style.display = 'flex';

        if (conversationState.name) {
            conversationState.step = 2;
            addMessage(getGreeting()).then(() => {
                addMessage(`Fresh start! 🌟 Enna da ${conversationState.name}, sollu!`);
            });
        } else {
            startConversation();
        }
    });

    // Chat History nav
    $('#navChatHistory').addEventListener('click', () => {
        closeSidebar();
        renderChatHistory();
        $('#chatHistoryModal').classList.add('open');
    });

    $('#navMoodTracker').addEventListener('click', () => {
        closeSidebar();
        renderMoodTracker();
        $('#moodModal').classList.add('open');
    });

    $('#navSelfCare').addEventListener('click', () => {
        closeSidebar();
        renderSelfCare();
        $('#selfCareModal').classList.add('open');
    });

    $('#navAbout').addEventListener('click', () => {
        closeSidebar();
        $('#aboutModal').classList.add('open');
    });

    // Modal closes
    $('#moodModalClose').addEventListener('click', () => $('#moodModal').classList.remove('open'));
    $('#selfCareModalClose').addEventListener('click', () => $('#selfCareModal').classList.remove('open'));
    $('#aboutModalClose').addEventListener('click', () => $('#aboutModal').classList.remove('open'));
    $('#profileModalClose').addEventListener('click', () => $('#profileModal').classList.remove('open'));
    $('#chatHistoryModalClose').addEventListener('click', () => $('#chatHistoryModal').classList.remove('open'));

    // Profile nav
    $('#navProfile').addEventListener('click', () => {
        closeSidebar();
        openProfileModal();
    });

    // Close modals on overlay click
    $$('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });

    // Mood quick select in sidebar
    $$('.mood-emoji').forEach(btn => {
        btn.addEventListener('click', () => {
            const mood = btn.dataset.mood;
            saveMood(mood);

            // Visual feedback
            $$('.mood-emoji').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected', 'burst');
            setTimeout(() => btn.classList.remove('burst'), 400);

            // Send a message about it
            const moodMessages = {
                happy: "Naan happy ah iruken! 😊",
                okay: "Normal ah dhan iruken 😐",
                sad: "Konjam sad ah feel panren 😢",
                stressed: "Romba stress ah iruken 😰",
                loved: "Loved ah feel panren today 🥰"
            };

            sendMessage(moodMessages[mood] || "Just checking in!");
            closeSidebar();
        });
    });

    // Set active nav
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            $$('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// ---- Profile System ----
let selectedEmojiAvatar = null;

function getUserProfile() {
    return {
        name: localStorage.getItem(STORAGE_KEYS.userName) || '',
        photo: localStorage.getItem(STORAGE_KEYS.userPhoto) || '',
        status: localStorage.getItem(STORAGE_KEYS.userStatus) || '',
        avatar: localStorage.getItem(STORAGE_KEYS.userAvatar) || '🧑'
    };
}

// Update the header avatar with saved profile
function updateHeaderAvatar() {
    const profile = getUserProfile();
    const headerPhoto = $('#headerUserPhoto');
    const headerEmoji = $('.header-avatar-emoji');

    if (profile.photo) {
        headerPhoto.src = profile.photo;
        headerPhoto.classList.add('visible');
        if (headerEmoji) headerEmoji.style.display = 'none';
    } else {
        headerPhoto.classList.remove('visible');
        if (headerEmoji) {
            headerEmoji.style.display = '';
            headerEmoji.textContent = profile.avatar;
        }
    }
}

function populateVoiceList() {
    const voiceSelect = $('#voiceSelect');
    if (!voiceSelect || !('speechSynthesis' in window)) return;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return; // Might not be loaded yet

    // Clear existing options except the first "Default Auto-Detect"
    while (voiceSelect.options.length > 1) {
        voiceSelect.remove(1);
    }
    
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.voiceURI;
        voiceSelect.appendChild(option);
    });
    
    // Set selected value if any
    const savedVoice = localStorage.getItem(STORAGE_KEYS.voiceURI);
    if (savedVoice) {
        voiceSelect.value = savedVoice;
    }
}

function openProfileModal() {
    const profile = getUserProfile();
    const nameInput = $('#profileNameInput');
    const statusInput = $('#profileStatusInput');
    const aiNameInput = $('#aiNameInput');
    const photoImg = $('#profilePhotoImg');
    const photoPreview = $('#profilePhotoPreview');

    // Fill in saved values
    nameInput.value = profile.name;
    statusInput.value = profile.status;
    if (aiNameInput) aiNameInput.value = getAIName();

    // Populate and set voice
    populateVoiceList();
    const voiceSelect = $('#voiceSelect');
    if (voiceSelect) {
        voiceSelect.value = localStorage.getItem(STORAGE_KEYS.voiceURI) || 'default';
    }

    // Highlight active AI name preset
    $$('.ai-name-chip').forEach(chip => {
        chip.classList.toggle('selected', chip.dataset.name === getAIName());
    });

    if (profile.photo) {
        photoImg.src = profile.photo;
        photoImg.classList.add('has-photo');
    } else {
        photoImg.classList.remove('has-photo');
        // Show emoji avatar in the preview
        const existingEmoji = photoPreview.querySelector('.emoji-avatar-preview');
        if (existingEmoji) existingEmoji.remove();
        const emojiEl = document.createElement('span');
        emojiEl.className = 'emoji-avatar-preview';
        emojiEl.textContent = profile.avatar;
        emojiEl.style.fontSize = '3rem';
        photoPreview.insertBefore(emojiEl, photoPreview.firstChild);
    }

    // Highlight selected emoji avatar
    selectedEmojiAvatar = profile.avatar;
    $$('.avatar-option').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.avatar === selectedEmojiAvatar);
    });

    $('#profileModal').classList.add('open');
}

function initProfile() {
    // Populate voices when they are loaded (some browsers load them async)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    // Photo upload click
    const photoPreview = $('#profilePhotoPreview');
    const photoInput = $('#profilePhotoInput');

    photoPreview.addEventListener('click', () => {
        photoInput.click();
    });

    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            const photoImg = $('#profilePhotoImg');
            photoImg.src = dataUrl;
            photoImg.classList.add('has-photo');
            // Remove emoji preview if present
            const existingEmoji = photoPreview.querySelector('.emoji-avatar-preview');
            if (existingEmoji) existingEmoji.remove();
            // Temporarily store until save
            photoPreview.dataset.tempPhoto = dataUrl;
        };
        reader.readAsDataURL(file);
    });

    // Emoji avatar selection
    $$('.avatar-option').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.avatar-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedEmojiAvatar = btn.dataset.avatar;

            // Clear photo and show emoji in preview
            const photoImg = $('#profilePhotoImg');
            photoImg.classList.remove('has-photo');
            photoPreview.dataset.tempPhoto = '';
            const existingEmoji = photoPreview.querySelector('.emoji-avatar-preview');
            if (existingEmoji) existingEmoji.remove();
            const emojiEl = document.createElement('span');
            emojiEl.className = 'emoji-avatar-preview';
            emojiEl.textContent = selectedEmojiAvatar;
            emojiEl.style.fontSize = '3rem';
            photoPreview.insertBefore(emojiEl, photoPreview.firstChild);
        });
    });

    // AI name preset chips
    $$('.ai-name-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            $$('.ai-name-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            const aiNameInput = $('#aiNameInput');
            if (aiNameInput) aiNameInput.value = chip.dataset.name;
        });
    });

    // Save profile
    $('#profileSaveBtn').addEventListener('click', () => {
        const name = $('#profileNameInput').value.trim();
        const status = $('#profileStatusInput').value.trim();
        const aiName = $('#aiNameInput') ? $('#aiNameInput').value.trim() : '';
        const voiceSelect = $('#voiceSelect');
        const voiceURI = voiceSelect ? voiceSelect.value : 'default';
        const tempPhoto = photoPreview.dataset.tempPhoto;

        if (name) {
            localStorage.setItem(STORAGE_KEYS.userName, name);
            conversationState.name = name;
        }
        if (status) {
            localStorage.setItem(STORAGE_KEYS.userStatus, status);
        }
        if (aiName) {
            localStorage.setItem(STORAGE_KEYS.aiName, aiName);
        }
        if (voiceURI) {
            localStorage.setItem(STORAGE_KEYS.voiceURI, voiceURI);
        }
        if (tempPhoto) {
            localStorage.setItem(STORAGE_KEYS.userPhoto, tempPhoto);
            localStorage.removeItem(STORAGE_KEYS.userAvatar); // Photo takes priority
        } else if (selectedEmojiAvatar) {
            localStorage.setItem(STORAGE_KEYS.userAvatar, selectedEmojiAvatar);
            localStorage.removeItem(STORAGE_KEYS.userPhoto); // Emoji takes priority
        }

        // Update the header avatar and AI name immediately
        updateHeaderAvatar();
        updateAINameDisplay();

        // Close modal with success feedback
        const saveBtn = $('#profileSaveBtn');
        saveBtn.textContent = '✅ Saved!';
        setTimeout(() => {
            saveBtn.textContent = '💾 Save Profile';
            $('#profileModal').classList.remove('open');
        }, 1000);
    });

    // Header profile button click -> open profile modal
    $('#headerProfileBtn').addEventListener('click', () => {
        openProfileModal();
    });

    // Load saved profile into header on startup
    updateHeaderAvatar();
    updateAINameDisplay();
}

// ---- Chat History Renderer ----
function renderChatHistory() {
    const archives = getChatArchives();
    const container = $('#chatHistoryList');

    if (archives.length === 0) {
        container.innerHTML = '<p class="chat-history-empty">No chat history yet! 💬<br>Start chatting and your conversations will be saved here.</p>';
        return;
    }

    container.innerHTML = archives.slice().reverse().map(archive => `
        <div class="chat-history-item" data-id="${archive.id}">
            <div class="chat-history-item-header">
                <span class="chat-history-date">📅 ${archive.date}</span>
                <span class="chat-history-count">${archive.messageCount} messages</span>
            </div>
            <p class="chat-history-preview">${archive.preview}</p>
            <div class="chat-history-actions">
                <button class="chat-history-view-btn" onclick="viewArchivedChat(${archive.id})">👁 View</button>
                <button class="chat-history-delete-btn" onclick="deleteArchivedChat(${archive.id})">🗑 Delete</button>
            </div>
        </div>
    `).join('');
}

function viewArchivedChat(archiveId) {
    const archive = loadArchivedChat(archiveId);
    if (!archive) return;

    // Archive current chat first
    archiveCurrentChat();

    // Clear current chat
    chatMessages.innerHTML = `<div class="date-divider"><span id="chatDate">${archive.date}</span></div>`;
    conversationState = { step: 2, name: conversationState.name, askedFood: false, askedMood: false, detectedMood: 'neutral', messageCount: 0 };
    quickReplies.style.display = 'none';

    // Render archived messages
    archive.messages.forEach(msg => {
        const el = createMessageElement(msg.text, msg.type, msg.time);
        chatMessages.appendChild(el);
    });
    scrollToBottom();

    // Close modal
    $('#chatHistoryModal').classList.remove('open');
}

function deleteArchivedChat(archiveId) {
    let archives = getChatArchives();
    archives = archives.filter(a => a.id !== archiveId);
    localStorage.setItem(STORAGE_KEYS.chatArchive, JSON.stringify(archives));
    renderChatHistory();
}

// ---- Initialize App ----
function init() {
    initTheme();
    updateAINameDisplay();
    initSplash();
    initEvents();
    initProfile();
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
