# 42-Wordle

A multilingual Wordle web application built with Node.js, Express, Handlebars, and SQLite/MySQL. Features user authentication via 42 API, leaderboards, and support for multiple languages.

Try it on https://42wordle.whatsweb.fr/

## Features

- Play Wordle in various languages
- User authentication with 42 API OAuth
- Personal and global statistics/leaderboards
- Multilingual support (English, French, Japanese, etc.)
- Responsive UI with Handlebars templates

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm
- SQLite or MySQL

### Installation

1. Clone the repository:
```sh
git clone https://github.com/Liammmmmmmm/42-wordle.git
cd 42-wordle
```

2. Install dependencies:
```sh
npm install
```

3. Copy `.env.example` to `.env` and fill in required values:
```sh
cp .env.example .env
```

3. Initialize the database:
```sh
node init_db.js
```

### Running the App

Start the development server:

```sh
npm run dev
```

##

Made by lilefebv & gueberso