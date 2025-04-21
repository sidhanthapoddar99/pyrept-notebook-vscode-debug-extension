export function activate(context) {
    return {
      renderOutputItem: (item, element) => {
        const pre = document.createElement("pre");
        pre.textContent = item.text();
        element.appendChild(pre);
      }
    };
  }