(function() {
	let on = false;
	const SHOW_TEXT = 'show scripts';
	const HIDE_TEXT = 'hide scripts';
	const style = document.createElement('style');
	style.innerHTML = `script { display: block; white-space: pre; }`;

	const button = document.createElement('button');
	button.type = 'button';
	button.innerText = SHOW_TEXT;
	button.onclick = () => {
		on = !on;
		if (on) {
			document.head.appendChild(style);
			button.innerText = HIDE_TEXT;
		} else {
			document.head.removeChild(style);
			button.innerText = SHOW_TEXT;
		}
	};

	document.body.appendChild(button);
}());
