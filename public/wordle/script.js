

const	position = {
	x: 1,
	y: 1
};

let pause_event = false;

function isalpha(ch) {
	return (/^[A-Z]$/i.test(ch));
}

function toast_error(error) {
	Toastify({
		text: error || "An error occured",
		duration: 5000,
		close: true,
		gravity: "top",
		position: "center",
		stopOnFocus: true,
		style: {
			background: "#bd3030",
		},
	}).showToast();
	pause_event = false;
}

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

function setLetter(pos, letter)
{
	document.querySelector(`#wordle-${pos.y}-${pos.x} .front`).innerText = letter;
	document.querySelector(`#wordle-${pos.y}-${pos.x} .back`).innerText = letter;
}

function getLetter(pos)
{
	return (document.querySelector(`#wordle-${pos.y}-${pos.x} .front`).innerText);
}

function flipTile(pos, type) {
	document.getElementById(`wordle-${pos.y}-${pos.x}`).classList.add(type);
	document.getElementById(`wordle-${pos.y}-${pos.x}`).classList.add("flipped");
}

addEventListener("keydown", (event) => keyaction(event.key));

function keyaction(key) {
	if (pause_event) return ;
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
		if (position.x != 6)
			return (toast_error("The word should be 5 letters long"));
		if (position.y > 6)
			return (toast_error("The game is over !"));

		pause_event = true;

		axios.post('/api/wordle/validateword', {
			word: `${getLetter({x: 1, y: position.y})}${getLetter({x: 2, y: position.y})}${getLetter({x: 3, y: position.y})}${getLetter({x: 4, y: position.y})}${getLetter({x: 5, y: position.y})}`
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
					return ;
				}

			}, 800);
		})
		.catch(function (error) {
			console.log(error);
			toast_error(error.response.data.details);
		})
	}
}

function saveResults()
{
	axios.post('/api/wordle/saveresults', {
		word: `${getLetter({x: 1, y: position.y})}${getLetter({x: 2, y: position.y})}${getLetter({x: 3, y: position.y})}${getLetter({x: 4, y: position.y})}${getLetter({x: 5, y: position.y})}`,
		time: 100,
		atempts: 3
	})
	.then(function (response) {
		console.log(response);		
	})
	.catch(function (error) {
		console.log(error);
	})
}