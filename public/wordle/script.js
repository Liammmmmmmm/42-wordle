

const	position = {
	x: 1,
	y: 1
};

let start_time = undefined;
let pause_event = false;

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

addEventListener("keydown", (event) => keyaction(event.key));

function keyaction(key) {
	if (pause_event) return ;
	if (!start_time) start_time = Date.now();
	if (isalpha(key) && position.y <= 6 && position.x <= 5)
	{
		setLetter(position, key);
		position.x++;
	}
	else if ((key == "Delete" || key == "Backspace") && position.y >= 1 && position.x > 1)
	{
		position.x--;
		setLetter(position, "");
	}
	else if (key == "Enter")
	{
		if (position.x != 6) {
			pause_event = true;
			shakeCurrentRow();
			return ;
		}

		pause_event = true;
		const word = `${getLetter({x: 1, y: position.y})}${getLetter({x: 2, y: position.y})}${getLetter({x: 3, y: position.y})}${getLetter({x: 4, y: position.y})}${getLetter({x: 5, y: position.y})}`;

		axios.post('/api/wordle/validateword', {
			word: word
		})
		.then(function (response) {
			const validation = response.data.validation;
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
			console.log(error);
			shakeCurrentRow();
		})
	}
}

function saveResults(word)
{
	axios.post('/api/wordle/saveresults', {
		word: word,
		time: (Date.now() - start_time) / 1000,
		attempts: position.y - 1
	})
	.catch(function (error) {
		console.log(error);
	})
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

    let shareText = `42 Wordle ${dateStr} ${position.y - 1}/6\n\n`;

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

            // Optional: Change button text temporarily
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
