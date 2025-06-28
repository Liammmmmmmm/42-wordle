

const	position = {
	x: 1,
	y: 1
};

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

// function toast_error(error) {
// 	Toastify({
// 		text: error || "An error occured",
// 		duration: 5000,
// 		close: true,
// 		gravity: "top",
// 		position: "center",
// 		stopOnFocus: true,
// 		style: {
// 			background: "#bd3030",
// 		},
// 	}).showToast();

// 	pause_event = false;
// }

function toast_success(msg) {
	Toastify({
		text: msg || "Success",
		duration: 5000,
		close: true,
		gravity: "top",
		position: "center",
		stopOnFocus: true,
		style: {
			background: "#14a633",
		},
	}).showToast();
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
	if (pause_event) return  ;
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
		// if (position.x != 6)
			// return  (toast_error("The word should be 5 letters long"));
		if (position.x != 6) {
			pause_event = true;
			shakeCurrentRow();
			return ;
		}
		// if (position.y > 6)
		// 	return (toast_error("The game is over !"));

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

				if (validation[0] == "correct" && validation[1] == "correct" && validation[2] == "correct" && validation[3] == "correct" && validation[4] == "correct") {
					toast_success("Congratulations !");
					pause_event = true;
					return  ;
				}
				setTimeout(() => {
					for (let i = 0; i < 5; i++) {
						setKeyboardTileColor(word[i], validation[i]);
					}
				}, 550);
			}, 800);
		})
		.catch(function (error) {
			console.log(error);
			shakeCurrentRow();
		})
	}
}
