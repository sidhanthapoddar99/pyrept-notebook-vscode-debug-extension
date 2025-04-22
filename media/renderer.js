// FILE: media/renderer.js
export function activate() {
    return {
      renderOutputItem(item, element) {
        const pre = document.createElement("pre");
        pre.textContent = item.text();
        element.replaceChildren(pre);
      }
    };
  }