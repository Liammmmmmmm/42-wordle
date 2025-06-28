

const	position = {
	x: 1,
	y: 1
};

function isalpha(ch) {
	return (/^[A-Z]$/i.test(ch));
}

addEventListener("keydown", (event) => {
	if (isalpha(event.key) && position.y <= 6 && position.x <= 5)
	{
		document.getElementById(`wordle-${position.y}-${position.x}`).innerText = event.key;
		position.x++;
		console.log("valid");
	}
	else if ((event.key == "Delete" || event.key == "Backspace") && position.y >= 1 && position.x > 1)
	{
		position.x--;
		document.getElementById(`wordle-${position.y}-${position.x}`).innerText = "";
	}
	else if (event.key == "Enter" && position.y <= 6 && position.x == 6)
	{
		position.y++;
		position.x = 1;
	}
	console.log(event.key, position)
})
