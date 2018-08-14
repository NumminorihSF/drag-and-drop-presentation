(function() {
  const EVENTS = [
    'drag',
    'drop',
    'dragstart',
    'dragend',
    'dragover',
    'dragenter',
    'dragleave',
    'mousedown',
    'mouseup',
    'mouseclick',
    'mouseover',
    'mouseleave',
    'mousemove',
    'click',
    'touch',
    'touchstart',
    'touchend',
    'touchmove',
  ];

  const container = document.createElement('ul');

  container.style.marginTop = '10px';

  document.body.appendChild(container);

  let lastEventName = '';
  let lastEventCount = 0;

  let lastElementTimer = 0;
  let lastElement = null;

  function writeEvent(event, count) {
    const element = document.createElement('li');
    const timer = setTimeout(() => {
      container.removeChild(element)
    }, 5000);

    element.innerText = `${event} - ${count}`;

    lastElementTimer = timer;
    lastElement = element;

    if (container.children.length) {
      container.insertBefore(element, container.firstChild);
    } else {
      container.appendChild(element);
    }

  }

  function rewriteEvent(event, count) {
    clearTimeout(lastElementTimer);
    container.removeChild(lastElement);
    writeEvent(event, count);
  }

  EVENTS.forEach(event => {
    document.addEventListener(event, function (event) {
      if (lastEventName === event.type) {
        lastEventCount++;
        rewriteEvent(event.type, lastEventCount);
      } else {
        lastEventName = event.type;
        lastEventCount = 1;
        writeEvent(event.type, lastEventCount);
      }

    })
  });
}());
