const	position = {
	x: 1,
	y: 1
};

let start_time = undefined;
let pause_event = false;
let isPnaessen = window.currentUserLogin === 'pnaessen';
let gameMode = window.gameMode || 'normal';

let hardModeConstraints = {
	requiredLetters: new Set(),
	correctPositions: {},
	bannedPositions: {}
};

class Confetti {
	constructor() {
		this.particles = [];
		this.canvas = null;
		this.ctx = null;
		this.animationId = null;
	}

	init() {
		this.canvas = document.createElement('canvas');
		this.canvas.style.position = 'fixed';
		this.canvas.style.top = '0';
		this.canvas.style.left = '0';
		this.canvas.style.width = '100%';
		this.canvas.style.height = '100%';
		this.canvas.style.pointerEvents = 'none';
		this.canvas.style.zIndex = '9999';
		document.body.appendChild(this.canvas);

		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.ctx = this.canvas.getContext('2d');

	}

	createParticle() {
		return {
			x: Math.random() * this.canvas.width,
			y: -10,
			vx: (Math.random() - 0.5) * 2,
			vy: Math.random() * 3 + 2,
			size: Math.random() * 4 + 2,
			color: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)],
			angle: Math.random() * 360,
			angleSpeed: (Math.random() - 0.5) * 10
		};
	}

	burst(duration = 5000, intensity = 2) {
		if (!this.canvas) this.init();

		const startTime = Date.now();
		const animate = () => {
			const elapsed = Date.now() - startTime;

			if (elapsed < duration) {
				// Add new particles
				for (let i = 0; i < intensity; i++) {
					this.particles.push(this.createParticle());
				}
			}

			// Clear canvas
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

			// Update and draw particles
			this.particles = this.particles.filter(particle => {
				particle.x += particle.vx;
				particle.y += particle.vy;
				particle.vy += 0.1; // gravity
				particle.angle += particle.angleSpeed;

				if (particle.y > this.canvas.height) return false;

				this.ctx.save();
				this.ctx.translate(particle.x, particle.y);
				this.ctx.rotate(particle.angle * Math.PI / 180);
				this.ctx.fillStyle = particle.color;
				this.ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
				this.ctx.restore();

				return true;
			});

			if (this.particles.length > 0 || elapsed < duration) {
				this.animationId = requestAnimationFrame(animate);
			} else {
				this.cleanup();
			}
		};
		animate();
	}

	quickBurst() {
		this.burst(500, 6);
	}

	cleanup() {
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
		}
		if (this.canvas && this.canvas.parentNode) {
			this.canvas.parentNode.removeChild(this.canvas);
			this.canvas = null;
		}
		this.particles = [];
	}
}

const confetti = new Confetti();

window.addEventListener("load", (event) => {
	loadGameState();
	if (document.getElementById("attemptCount").innerText != "")
	{
		pause_event = true;
		if (document.getElementById("attemptCount").innerText == "7")
		{
			document.getElementById("attemptCount").innerText = 6;
			displayShareResult();
			originalOpenPopUpLoose();
		}
		else
		{
			displayShareResult();
			originalOpenPopUpWin();
		}
	}

	if (isPnaessen) {
		confetti.burst(5000, 5);
	}
});


/* If CSS modification isn't enough to fix the double-tap issue on mobile, this would prevent double-tapping on keys.
	Stills enable zooming on page! */

// document.querySelectorAll('.key').forEach(button => {
// 	let lastTap = 0;

// 	button.addEventListener('touchend', (e) => {
// 		const currentTime = new Date().getTime();
// 		const tapLength = currentTime - lastTap;

// 		if (tapLength < 500 && tapLength > 0) {
// 			e.preventDefault();
// 		}
// 		lastTap = currentTime;
// 	});
// });

function showHardModeError(message) {
	const errorDiv = document.createElement('div');
	errorDiv.className = 'hard-mode-error';
	errorDiv.textContent = message;
	document.body.appendChild(errorDiv);

	setTimeout(() => {
		errorDiv.style.animation = 'errorFadeIn 0.3s ease reverse';
		setTimeout(() => {
			document.body.removeChild(errorDiv);
		}, 300);
	}, 2000);
}

function validateHardModeConstraints(word) {
	if (gameMode !== 'hard') return { valid: true };

	for (let pos in hardModeConstraints.correctPositions) {
		const requiredLetter = hardModeConstraints.correctPositions[pos];
		if (word[pos - 1].toUpperCase() !== requiredLetter) {
			return {
				valid: false,
				message: `Position ${pos} must be ${requiredLetter}`
			};
		}
	}

	for (let letter of hardModeConstraints.requiredLetters) {
		if (!word.toUpperCase().includes(letter)) {
			return {
				valid: false,
				message: `Word must contain ${letter}`
			};
		}
	}

	for (let letter in hardModeConstraints.bannedPositions) {
		for (let bannedPos of hardModeConstraints.bannedPositions[letter]) {
			if (word[bannedPos - 1].toUpperCase() === letter) {
				return {
					valid: false,
					message: `${letter} cannot be in position ${bannedPos}`
				};
			}
		}
	}

	return { valid: true };
}

function updateHardModeConstraints(word, validation) {
	if (gameMode !== 'hard') return;

	for (let i = 0; i < 5; i++) {
		const letter = word[i].toUpperCase();
		const result = validation[i];

		if (result === 'correct') {
			hardModeConstraints.correctPositions[i + 1] = letter;
			hardModeConstraints.requiredLetters.add(letter);
		} else if (result === 'present') {
			hardModeConstraints.requiredLetters.add(letter);
			if (!hardModeConstraints.bannedPositions[letter]) {
				hardModeConstraints.bannedPositions[letter] = [];
			}
			hardModeConstraints.bannedPositions[letter].push(i + 1);
		}
	}
}

function isalpha(ch) {
	return (/^[A-Z]$/i.test(ch));
}

function setKeyboardTileColor(key, keyState) {
	const buttons = document.querySelectorAll('.key');

	let targetButton = null;
	buttons.forEach(button => {
		if (button.textContent.toUpperCase() === key.toUpperCase()) {
			targetButton = button;
		}
	});

	if (!targetButton) return ;

	if (targetButton.classList.contains('correct')) {
		return ;
	}
	if (targetButton.classList.contains('present') && keyState === 'absent') {
		return ;
	}
	targetButton.classList.remove('absent', 'present', 'correct');
	targetButton.classList.add(keyState);
}

function shakeCurrentRow() {
	for (let x = 1; x <= 5; x++) {
		const tile = document.querySelector(`#wordle-${position.y}-${x}`);
		tile.classList.remove('tile-delete');
		void tile.offsetWidth;
		tile.classList.add('tile-delete');
		setTimeout(() => {
			tile.classList.remove('tile-delete');
		}, 150);
	}
	setTimeout(() => {
		pause_event = false;
	}, 150);
}

function setLetter(pos, letter) {
	const tile = document.querySelector(`#wordle-${pos.y}-${pos.x}`);

	tile.querySelector('.front').innerText = letter;
	tile.querySelector('.back').innerText = letter;

	if (letter) {
		tile.classList.remove('tile-bounce');
		void tile.offsetWidth;
		tile.classList.add('tile-bounce');

		setTimeout(() => {
			tile.classList.remove('tile-bounce');
		}, 150);
	} else {
		tile.classList.remove('tile-delete');
		void tile.offsetWidth;
		tile.classList.add('tile-delete');

		setTimeout(() => {
			tile.classList.remove('tile-delete');
		}, 150);
	}
}

function getLetter(pos)
{
	return  (document.querySelector(`#wordle-${pos.y}-${pos.x} .front`).innerText);
}

function flipTile(pos, type) {
	document.getElementById(`wordle-${pos.y}-${pos.x}`).classList.add(type);
	document.getElementById(`wordle-${pos.y}-${pos.x}`).classList.add("flipped");
}

function setCookie(name, value, days) {
	const expires = new Date(Date.now() + days*24*60*60*1000).toUTCString();
	document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
	return null;
}

function delCookie(name) {
	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

function saveGameState() {
	const state = {
		date: new Date().toDateString(),
		position: {...position},
		start_time,
		gameMode,
		hardModeConstraints: JSON.parse(JSON.stringify(hardModeConstraints)),
		tiles: []
	};
	const state_keyboard = {
		keyboard: {}
	}
	for (let y = 1; y <= 6; y++) {
		let row = [];
		for (let x = 1; x <= 5; x++) {
			const tile = document.querySelector(`#wordle-${y}-${x}`);
			if (!tile) continue;
			row.push({
				letter: tile.querySelector('.front').innerText,
				classes: Array.from(tile.classList)
			});
		}
		state.tiles.push(row);
	}

	document.querySelectorAll('.key').forEach(btn => {
		state_keyboard.keyboard[btn.textContent.toUpperCase()] = Array.from(btn.classList);
	});

	setCookie('wordle_state', JSON.stringify(state), 2);
	setCookie('keyboard_state', JSON.stringify(state_keyboard), 2);
}

function loadGameState() {
	const stateStr = getCookie('wordle_state');
	const stateKBStr = getCookie('keyboard_state');
	if (!stateStr) return;
	let state;
	let stateKB;
	try {
		state = JSON.parse(stateStr);
		stateKB = JSON.parse(stateKBStr);
	} catch { return; }
	if (!state || state.date !== new Date().toDateString())
	{
		delCookie('wordle_state');
		delCookie('keyboard_state');
		return ;
	}

	if (state.gameMode && state.gameMode !== gameMode) {
		delCookie('wordle_state');
		delCookie('keyboard_state');
		return;
	}

	position.x = state.position.x;
	position.y = state.position.y;
	start_time = state.start_time;

	if (state.hardModeConstraints) {
		hardModeConstraints = {
			requiredLetters: new Set(
				Array.isArray(state.hardModeConstraints.requiredLetters)
					? state.hardModeConstraints.requiredLetters
					: []
			),
			correctPositions: state.hardModeConstraints.correctPositions || {},
			bannedPositions: state.hardModeConstraints.bannedPositions || {}
		};
	}

	for (let y = 1; y <= 6; y++) {
		for (let x = 1; x <= 5; x++) {
			const tile = document.querySelector(`#wordle-${y}-${x}`);
			if (!tile) continue;
			const tileState = state.tiles[y-1][x-1];
			tile.querySelector('.front').innerText = tileState.letter;
			tile.querySelector('.back').innerText = tileState.letter;
			tile.className = `tile ${tileState.classes.filter(c => c !== 'tile').join(' ')}`;
		}
	}

	document.querySelectorAll('.key').forEach(btn => {
		const key = btn.textContent.toUpperCase();
		if (stateKB.keyboard[key]) {
			btn.className = `key ${stateKB.keyboard[key].filter(c => c !== 'key').join(' ')}`;
		}
	});
}

addEventListener("keydown", (event) => {
	if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r') return ;
	keyaction(event.key)
});

function keyaction(key) {
	if (pause_event) return ;
	if (!start_time) {
		start_time = Date.now();
		try {
			axios.post('/api/wordle/starttyping');
		} catch (error) {
			console.error(error);
		}
	}
	if (isalpha(key) && position.y <= 6 && position.x <= 5)
	{
		setLetter(position, key);
		position.x++;
		saveGameState();

		if (isPnaessen) {
			confetti.quickBurst();
		}
	}
	else if ((key == "Delete" || key == "Backspace") && position.y >= 1 && position.x > 1)
	{
		position.x--;
		setLetter(position, "");
		saveGameState();
	}
	else if (key == "Enter")
	{
		if (position.x != 6) {
			pause_event = true;
			shakeCurrentRow();
			return ;
		}

		const word = `${getLetter({x: 1, y: position.y})}${getLetter({x: 2, y: position.y})}${getLetter({x: 3, y: position.y})}${getLetter({x: 4, y: position.y})}${getLetter({x: 5, y: position.y})}`;

		const validation = validateHardModeConstraints(word);
		if (!validation.valid) {
			showHardModeError(validation.message);
			shakeCurrentRow();
			return;
		}

		pause_event = true;

		axios.post('/api/wordle/validateword', {
			word: word
		})
		.then(function (response) {
			const validation = response.data.validation;

			updateHardModeConstraints(word, validation);

			flipTile({x: 1, y: position.y}, validation[0]);
			setTimeout(() => flipTile({x: 2, y: position.y}, validation[1]), 200);
			setTimeout(() => flipTile({x: 3, y: position.y}, validation[2]), 400);
			setTimeout(() => flipTile({x: 4, y: position.y}, validation[3]), 600);
			setTimeout(() => {
				flipTile({x: 5, y: position.y}, validation[4]);

				position.y++;
				position.x = 1;
				pause_event = false;
				setTimeout(() => {
					for (let i = 0; i < 5; i++) {
						setKeyboardTileColor(word[i], validation[i]);
					}

					saveGameState();
				}, 550);
				if (validation[0] == "correct" && validation[1] == "correct" && validation[2] == "correct" && validation[3] == "correct" && validation[4] == "correct") {

					saveResults(word);

					pause_event = true;
					return  ;
				}
				else if (position.y === 7)
				{
					document.getElementById("attemptCount").innerText = position.y - 1;
					document.getElementById("timeCount").innerText = (Date.now() - start_time) / 1000;
					setTimeout(openPopUpLoose, 800);
				}
			}, 800);
		})
		.catch(function (error) {
			console.error(error);
			shakeCurrentRow();
		})
	}
}

function saveResults(word)
{
	document.getElementById("attemptCount").innerText = position.y - 1;
	document.getElementById("timeCount").innerText = (Date.now() - start_time) / 1000;
	setTimeout(openPopUpWin, 800);
}

function openPopUpWin() {
	document.getElementById("gameOverModal").classList.remove("hide-modal");
	document.getElementById("modalTitle").classList.add("win");
	document.getElementById("modalTitle").innerText = "You Win!";
}

function openPopUpLoose() {
	document.getElementById("gameOverModal").classList.remove("hide-modal");
	document.getElementById("modalTitle").classList.add("lose");
}

function generateShareText() {
	const date = new Date();
	const dateStr = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;

	let shareText = `42 Wordle ${dateStr} ${position.y - 1}/6`;
	if (gameMode === 'hard') {
		shareText += ' (Hard Mode)';
	}
	shareText += '\n\n';

	for (let row = 1; row < position.y; row++) {
		let rowText = '';
		for (let col = 1; col <= 5; col++) {
			const tile = document.querySelector(`#wordle-${row}-${col}`);

			if (tile.classList.contains('correct')) {
				rowText += '🟩';
			} else if (tile.classList.contains('present')) {
				rowText += '🟨';
			} else if (tile.classList.contains('absent')) {
				rowText += '⬛';
			} else {
				rowText += '⬜';
			}
		}
		shareText += rowText + '\n';
	}

	const timeInSeconds = ((Date.now() - start_time) / 1000).toFixed(1);
	shareText += `\n⏱️ ${timeInSeconds}s`;
	shareText += `\n🎮 ${window.location.origin}`;

	return (shareText.trim());
}

async function copyToClipboard(text) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (err) {
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.style.position = 'fixed';
		textArea.style.left = '-999999px';
		textArea.style.top = '-999999px';
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
	}
}

function displayShareResult() {
	const shareResultDiv = document.getElementById('shareResult');
	shareResultDiv.innerHTML = '';

	for (let row = 1; row < position.y; row++) {
		const rowDiv = document.createElement('div');
		rowDiv.style.marginBottom = '2px';

		for (let col = 1; col <= 5; col++) {
			const tile = document.querySelector(`#wordle-${row}-${col}`);
			let emoji = '⬜';

			if (tile.classList.contains('correct')) {
				emoji = '🟩';
			} else if (tile.classList.contains('present')) {
				emoji = '🟨';
			} else if (tile.classList.contains('absent')) {
				emoji = '⬛';
			}

			const span = document.createElement('span');
			span.textContent = emoji;
			span.style.fontSize = '1.5rem';
			span.style.marginRight = '2px';
			rowDiv.appendChild(span);
		}

		shareResultDiv.appendChild(rowDiv);
	}
}

document.addEventListener('DOMContentLoaded', function() {
	const shareButton = document.getElementById('shareButton');
	const copyNotification = document.getElementById('copyNotification');
	const modal = document.getElementById('gameOverModal');
	const closeBtn = document.querySelector('.close');

	shareButton.addEventListener('click', async function() {
		const shareText = generateShareText();
		const success = await copyToClipboard(shareText);

		if (success) {
			copyNotification.classList.add('show');

			setTimeout(() => {
				copyNotification.classList.remove('show');
			}, 2000);

			const originalHTML = shareButton.innerHTML;
			shareButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Copied!';
			shareButton.style.backgroundColor = '#5fa35a';

			setTimeout(() => {
				shareButton.innerHTML = originalHTML;
				shareButton.style.backgroundColor = '';
			}, 2000);
		}
	});

	closeBtn.addEventListener('click', function() {
		modal.classList.add('hide-modal');
	});

	window.addEventListener('click', function(event) {
		if (event.target === modal) {
			modal.classList.add('hide-modal');
		}
	});
});

const originalOpenPopUpWin = openPopUpWin;
openPopUpWin = function() {
	originalOpenPopUpWin();
	displayShareResult();
};

const originalOpenPopUpLoose = openPopUpLoose;
openPopUpLoose = function() {
	originalOpenPopUpLoose();
	displayShareResult();
};
