// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Получаем user_id из URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');

let userData = null;
let currentScore = 0;
let scoreMultiplier = 1;

// Элементы DOM
const profileBtn = document.getElementById('profileBtn');
const gameBtn = document.getElementById('gameBtn');
const profileContent = document.getElementById('profileContent');
const gameContent = document.getElementById('gameContent');
const backBtn = document.getElementById('backBtn');
const clicker = document.getElementById('clicker');
const currentScoreElement = document.getElementById('currentScore');

// Обработчики событий
profileBtn.addEventListener('click', showProfile);
gameBtn.addEventListener('click', showGame);
backBtn.addEventListener('click', showProfile);
clicker.addEventListener('click', handleClick);

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    fetchUserData();
});

// Функции
async function fetchUserData() {
    try {
        const response = await fetch(`/api/user/${userId}`);
        if (!response.ok) throw new Error('Ошибка загрузки данных');
        
        userData = await response.json();
        updateProfileUI();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateUserData(pointsToAdd = 0, newLevel = null) {
    if (!userData) return;
    
    const updatedData = {
        user_id: userId,
        points: pointsToAdd,
        level: newLevel || userData.level
    };
    
    try {
        const response = await fetch('/api/user/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData)
        });
        
        if (!response.ok) throw new Error('Ошибка обновления данных');
        
        userData = await response.json();
        updateProfileUI();
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateProfileUI() {
    if (!userData) return;
    
    document.getElementById('userId').textContent = userData.user_id;
    document.getElementById('username').textContent = 
        userData.username || `${userData.first_name} ${userData.last_name || ''}`.trim();
    document.getElementById('userLevel').textContent = userData.level;
    document.getElementById('userPoints').textContent = userData.points;
    document.getElementById('userAvatar').src = userData.avatar_url;
    
    // Расчет прогресса до следующего уровня
    const pointsNeeded = userData.level * 100;
    const progress = Math.min((userData.points / pointsNeeded) * 100, 100);
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${Math.round(progress)}%`;
    
    // Анимация при заполнении прогресса
    if (progress >= 100) {
        progressBar.classList.add('level-up');
    } else {
        progressBar.classList.remove('level-up');
    }
}

function showProfile() {
    profileContent.style.display = 'block';
    gameContent.style.display = 'none';
    updateProfileUI();
    
    // Проверяем, можно ли повысить уровень
    if (userData) {
        const pointsNeeded = userData.level * 100;
        if (userData.points >= pointsNeeded) {
            const newLevel = userData.level + 1;
            updateUserData(-pointsNeeded, newLevel);
            alert(`Поздравляем! Вы достигли уровня ${newLevel}!`);
        }
    }
}

function showGame() {
    profileContent.style.display = 'none';
    gameContent.style.display = 'block';
    currentScore = 0;
    currentScoreElement.textContent = currentScore;
}

function handleClick() {
    // Базовый клик дает 1 очко, умноженное на множитель уровня
    const pointsToAdd = 1 * scoreMultiplier;
    currentScore += pointsToAdd;
    currentScoreElement.textContent = currentScore;
    
    // Анимация клика
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
        this.style.transform = 'scale(1)';
    }, 100);
    
    // Случайное изменение эмодзи для разнообразия
    if (Math.random() > 0.9) {
        const emojis = ['🎮', '🕹️', '👾', '🎯', '🎲', '🧩', '🎳'];
        this.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    }
    
    // Увеличение множителя каждые 10 кликов
    if (currentScore % 10 === 0) {
        scoreMultiplier = 1 + Math.floor(currentScore / 50);
    }
}

// Сохраняем очки при выходе из игры
backBtn.addEventListener('click', () => {
    if (currentScore > 0) {
        updateUserData(currentScore);
    }
});