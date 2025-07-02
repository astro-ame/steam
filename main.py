import os
import telebot
from flask import Flask, request, jsonify
import pandas as pd
from datetime import datetime

# Инициализация бота и Flask
bot = telebot.TeleBot('8052515533:AAGYujwuInmDmJaRJwuG336E0iL2o1ehOxw')
app = Flask(__name__)

# Настройка базы данных
DB_FILE = 'users_data.xlsx'


def init_db():
    if not os.path.exists(DB_FILE):
        df = pd.DataFrame(columns=[
            'user_id', 'username', 'first_name', 'last_name',
            'level', 'points', 'total_points', 'avatar_url', 'last_updated'
        ])
        df.to_excel(DB_FILE, index=False)


def get_user(user_id):
    df = pd.read_excel(DB_FILE)
    user = df[df['user_id'] == user_id]
    return None if user.empty else user.iloc[0].to_dict()


def update_user(user_id, **kwargs):
    df = pd.read_excel(DB_FILE)
    if user_id not in df['user_id'].values:
        return None

    idx = df[df['user_id'] == user_id].index[0]
    for key, value in kwargs.items():
        if key in df.columns:
            df.at[idx, key] = value

    df.at[idx, 'last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    df.to_excel(DB_FILE, index=False)
    return df.iloc[idx].to_dict()


def create_user(user_data):
    df = pd.read_excel(DB_FILE)
    avatar_url = f"https://ui-avatars.com/api/?name={user_data.first_name}+{user_data.last_name}&background=random"
    new_user = {
        'user_id': user_data.id,
        'username': user_data.username,
        'first_name': user_data.first_name,
        'last_name': user_data.last_name,
        'level': 1,
        'points': 0,
        'total_points': 0,
        'avatar_url': avatar_url,
        'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    df = pd.concat([df, pd.DataFrame([new_user])], ignore_index=True)
    df.to_excel(DB_FILE, index=False)
    return new_user


# Обработчики команд бота
@bot.message_handler(commands=['start'])
def send_welcome(message):
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True)
    btn = telebot.types.KeyboardButton('Загрузить интерфейс')
    markup.add(btn)
    bot.send_message(message.chat.id, "Привет! Нажми кнопку ниже, чтобы открыть мини-приложение.", reply_markup=markup)


@bot.message_handler(func=lambda message: message.text == 'Загрузить интерфейс')
def send_mini_app(message):
    web_app = telebot.types.WebAppInfo(url=f"https://steam-nine-gold.vercel.app/index.html?user_id={message.from_user.id}")
    markup = telebot.types.InlineKeyboardMarkup()
    btn = telebot.types.InlineKeyboardButton("Открыть Mini App", web_app=web_app)
    markup.add(btn)
    bot.send_message(message.chat.id, "Нажмите кнопку ниже, чтобы открыть игровой интерфейс", reply_markup=markup)


# API для Mini App
@app.route('/api/user/<int:user_id>', methods=['GET'])
def api_get_user(user_id):
    user = get_user(user_id)
    if user:
        return jsonify(user)
    return jsonify({"error": "User not found"}), 404


@app.route('/api/user/update', methods=['POST'])
def api_update_user():
    data = request.json
    user_id = data.get('user_id')
    points = data.get('points', 0)
    level = data.get('level')

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    update_data = {}
    if points:
        update_data['points'] = points
    if level:
        update_data['level'] = level

    updated_user = update_user(user_id, **update_data)
    if updated_user:
        return jsonify(updated_user)
    return jsonify({"error": "Update failed"}), 400


# Вебхук для Telegram
@app.route('/webhook', methods=['POST'])
def webhook():
    if request.headers.get('content-type') == 'application/json':
        json_string = request.get_data().decode('utf-8')
        update = telebot.types.Update.de_json(json_string)
        bot.process_new_updates([update])
        return ''
    return 'Invalid content type', 403


# Запуск приложения
if __name__ == '__main__':
    init_db()
    # Установка вебхука
    bot.remove_webhook()
    bot.set_webhook(url='https://your-domain.com/webhook')
    app.run(host='0.0.0.0', port=5000, ssl_context=('cert.pem', 'key.pem'))