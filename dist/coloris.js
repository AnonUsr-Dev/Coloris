 /*!
 * Copyright (c) 2021 Momo Bassit.
 * Licensed under the MIT License (MIT)
 * https://github.com/mdbassit/Coloris
 */

(function (window, document, Math) {
  var ctx = document.createElement('canvas').getContext('2d');
  var currentColor = { r: 0, g: 0, b: 0, a: 1 };
  var picker, colorArea, colorAreaDims, colorMarker, colorPreview, colorValue,
  hueSlider, hueMarker, alphaSlider, alphaMarker, currentEl, oldColor;

  // Default settings
  var settings = {
    el: '[data-coloris]',
    parent: null,
    theme: 'light',
    wrap: true,
    margin: 2,
    format: 'hex',
    swatches: [],
    a11y: {
      open: 'Open color picker',
      close: 'Close color picker',
      marker: 'Saturation: {s}. Brightness: {v}.',
      hueSlider: 'Hue slider',
      alphaSlider: 'Opacity slider',
      input: 'Color value field',
      swatch: 'Color swatch',
      instruction: 'Saturation and brightness selector. Use up, down, left and right arrow keys to select.' } };



  /**
   * Configure the color picker.
   * @param {object} options Configuration options.
   */
  function configure(options) {
    if (typeof options !== 'object') {
      return;
    }

    for (var key in options) {
      switch (key) {
        case 'el':
          attachFields(options.el);
          if (options.wrap !== false) {
            wrapFields(options.el);
          }
          break;
        case 'parent':
          settings.parent = document.querySelector(options.parent);
          if (settings.parent) {
            settings.parent.appendChild(picker);
          }
          break;
        case 'theme':
          picker.setAttribute('class', "clr-picker clr-" + options.theme);
          break;
        case 'margin':
          options.margin *= 1;
          settings.margin = !isNaN(options.margin) ? options.margin : settings.margin;
          break;
        case 'wrap':
          if (options.el && options.wrap) {
            wrapFields(options.el);
          }
          break;
        case 'format':
          settings.format = options.format;
          break;
        case 'swatches':
          if (Array.isArray(options.swatches)) {(function () {
              var swatches = [];

              options.swatches.forEach(function (swatch, i) {
                swatches.push("<button id=\"clr-swatch-" + i + "\" aria-labelledby=\"clr-swatch-label clr-swatch-" + i + "\" style=\"color: " + swatch + ";\">" + swatch + "</button>");
              });

              if (swatches.length) {
                getEl('clr-swatches').innerHTML = "<div>" + swatches.join('') + "</div>";
              }})();
          }
          break;
        case 'a11y':
          var labels = options.a11y;
          var update = false;

          if (typeof labels === 'object') {
            for (var label in labels) {
              if (labels[label] && settings.a11y[label]) {
                settings.a11y[label] = labels[label];
                update = true;
              }
            }
          }

          if (update) {
            var openLabel = getEl('clr-open-label');
            var swatchLabel = getEl('clr-swatch-label');

            openLabel.innerHTML = settings.a11y.open;
            swatchLabel.innerHTML = settings.a11y.swatch;
            colorPreview.setAttribute('aria-label', settings.a11y.close);
            hueSlider.setAttribute('aria-label', settings.a11y.hueSlider);
            alphaSlider.setAttribute('aria-label', settings.a11y.alphaSlider);
            colorValue.setAttribute('aria-label', settings.a11y.input);
            colorArea.setAttribute('aria-label', settings.a11y.instruction);
          }}

    }
  }

  /**
   * Attach the color picker to input fields that match the selector.
   * @param {string} selector One or more selectors pointing to input fields.
   */
  function attachFields(selector) {
    // Show the color picker on click on the input fields that match the selector
    addListener(document, 'click', selector, function (event) {
      var parent = settings.parent;
      var coords = event.target.getBoundingClientRect();
      var offset = { x: 0, y: 0 };
      var left = coords.x;
      var top = window.scrollY + coords.y + coords.height + settings.margin;

      currentEl = event.target;
      oldColor = currentEl.value;
      picker.style.display = 'flex';

      // If the color picker is inside a custom container
      // set the position relative to it
      if (parent) {
        var style = window.getComputedStyle(parent);
        var marginTop = parseFloat(style.marginTop);
        var borderTop = parseFloat(style.borderTopWidth);

        offset = parent.getBoundingClientRect();
        offset.y += borderTop + window.scrollY;
        left -= offset.x;
        top = top + parent.scrollTop - offset.y;

        if (top + picker.offsetHeight > parent.clientHeight + parent.scrollTop - marginTop) {
          top -= coords.height + picker.offsetHeight + settings.margin * 2;
        }

        // Otherwise set the position relative to the whole document
      } else {
        if (top + picker.offsetHeight > document.documentElement.clientHeight) {
          top = window.scrollY + coords.y - picker.offsetHeight - settings.margin;
        }
      }

      picker.style.left = left + "px";
      picker.style.top = top + "px";
      colorAreaDims = {
        width: colorArea.offsetWidth,
        height: colorArea.offsetHeight,
        x: picker.offsetLeft + offset.x,
        y: picker.offsetTop + offset.y };


      setColorFromStr(currentEl.value);
      colorValue.focus({ preventScroll: true });
    });

    // Update the color preview of the input fields that match the selector
    addListener(document, 'input', selector, function (event) {
      var parent = event.target.parentNode;

      // Only update the preview if the field has been previously wrapped
      if (parent.classList.contains('clr-field')) {
        parent.style.color = event.target.value;
      }
    });
  }

  /**
   * Wrap the linked input fields in a div that adds a color preview.
   * @param {string} selector One or more selectors pointing to input fields.
   */
  function wrapFields(selector) {
    document.querySelectorAll(selector).forEach(function (field) {
      var parentNode = field.parentNode;

      if (!parentNode.classList.contains('clr-field')) {
        var wrapper = document.createElement('div');

        wrapper.innerHTML = "<button aria-labelledby=\"clr-open-label\"></button>";
        parentNode.insertBefore(wrapper, field);
        wrapper.setAttribute('class', 'clr-field');
        wrapper.style.color = field.value;
        wrapper.appendChild(field);
      }
    });
  }

  /**
   * Close the color picker.
   * @param {boolean} tiggerChange If true, trigger a "change" event on the linked input field.
   */
  function closePicker(tiggerChange) {
    if (currentEl) {
      if (tiggerChange && oldColor !== currentEl.value) {
        currentEl.dispatchEvent(new Event('change', { bubbles: true }));
      }

      picker.style.display = 'none';
      currentEl.focus({ preventScroll: true });
      currentEl = null;
    }
  }

  /**
   * Set the active color from a string.
   * @param {string} str String representing a color.
   */
  function setColorFromStr(str) {
    var rgba = strToRGBA(str);
    var hsva = RGBAtoHSVA(rgba);

    updateMarkerA11yLabel(hsva.s, hsva.v);
    updateColor(rgba);

    // Update the UI
    hueSlider.value = hsva.h;
    picker.style.color = "hsl(" + hsva.h + ", 100%, 50%)";
    hueMarker.style.left = hsva.h / 360 * 100 + "%";

    colorMarker.style.left = colorAreaDims.width * hsva.s / 100 + "px";
    colorMarker.style.top = 100 - colorAreaDims.height * hsva.v / 100 + "px";

    alphaSlider.value = hsva.a * 100;
    alphaMarker.style.left = hsva.a * 100 + "%";
  }

  /**
   * Copy the active color to the linked input field.
   */
  function pickColor() {
    if (currentEl) {
      currentEl.value = colorValue.value;
      currentEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /**
   * Set the active color based on a specific point in the color gradient.
   * @param {number} x Left position.
   * @param {number} y Top position.
   */
  function setColorAtPosition(x, y) {
    var hsva = {
      h: hueSlider.value * 1,
      s: x / colorAreaDims.width * 100,
      v: 100 - y / colorAreaDims.height * 100,
      a: alphaSlider.value / 100 };

    var rgba = HSVAtoRGBA(hsva);

    updateMarkerA11yLabel(hsva.s, hsva.v);
    updateColor(rgba);
    pickColor();
  }

  /**
   * Update the color marker's accessibility label.
   * @param {number} saturation
   * @param {number} value
   */
  function updateMarkerA11yLabel(saturation, value) {
    var label = settings.a11y.marker;

    saturation = saturation.toFixed(1) * 1;
    value = value.toFixed(1) * 1;
    label = label.replace('{s}', saturation);
    label = label.replace('{v}', value);
    colorMarker.setAttribute('aria-label', label);
  }

  /**
   * Move the color marker when dragged.
   * @param {object} event The MouseEvent object.
   */
  function moveMarker(event) {
    var x = event.pageX - colorAreaDims.x;
    var y = event.pageY - colorAreaDims.y;

    if (settings.parent) {
      y += settings.parent.scrollTop;
    }

    x = x < 0 ? 0 : x > colorAreaDims.width ? colorAreaDims.width : x;
    y = y < 0 ? 0 : y > colorAreaDims.height ? colorAreaDims.height : y;

    colorMarker.style.left = x + "px";
    colorMarker.style.top = y + "px";

    setColorAtPosition(x, y);
  }

  /**
   * Move the color marker when the arrow keys are pressed.
   * @param {number} offsetX The horizontal amount to move.
   * * @param {number} offsetY The vertical amount to move.
   */
  function moveMarkerOnKeydown(offsetX, offsetY) {
    var x = colorMarker.style.left.replace('px', '') * 1 + offsetX;
    var y = colorMarker.style.top.replace('px', '') * 1 + offsetY;

    colorMarker.style.left = x + "px";
    colorMarker.style.top = y + "px";

    setColorAtPosition(x, y);
  }

  /**
   * Update the color picker's input field and preview thumb.
   * @param {Object} rgba Red, green, blue and alpha values.
   */
  function updateColor(rgba) {
    for (var key in rgba) {
      currentColor[key] = rgba[key];
    }

    var hex = RGBAToHex(currentColor);
    var opaqueHex = hex.substring(0, 7);
    var rgbStr = RGBAToStr(currentColor);

    colorMarker.style.color = opaqueHex;
    alphaMarker.parentNode.style.color = opaqueHex;
    alphaMarker.style.color = hex;
    colorPreview.style.color = hex;
    colorValue.value = hex;

    switch (settings.format) {
      case 'mixed':
        if (currentColor.a === 1) {
          break;
        }
      case 'rgb':
        colorValue.value = rgbStr;
        break;}

  }

  /**
   * Set the hue when its slider is moved.
   */
  function setHue() {
    var hue = hueSlider.value * 1;
    var x = colorMarker.style.left.replace('px', '') * 1;
    var y = colorMarker.style.top.replace('px', '') * 1;

    picker.style.color = "hsl(" + hue + ", 100%, 50%)";
    hueMarker.style.left = hue / 360 * 100 + "%";

    setColorAtPosition(x, y);
  }

  /**
   * Set the alpha when its slider is moved.
   */
  function setAlpha() {
    var alpha = alphaSlider.value / 100;

    alphaMarker.style.left = alpha * 100 + "%";
    updateColor({ a: alpha });
    pickColor();
  }

  /**
   * Convert HSVA to RGBA.
   * @param {object} hsva Hue, saturation, value and alpha values.
   * @return {object} Red, green, blue and alpha values.
   */
  function HSVAtoRGBA(hsva) {
    var saturation = hsva.s / 100;
    var value = hsva.v / 100;
    var chroma = saturation * value;
    var hueBy60 = hsva.h / 60;
    var x = chroma * (1 - Math.abs(hueBy60 % 2 - 1));
    var m = value - chroma;

    chroma = chroma + m;
    x = x + m;
    m = m;

    var index = Math.floor(hueBy60) % 6;
    var red = [chroma, x, m, m, x, chroma][index];
    var green = [x, chroma, chroma, x, m, m][index];
    var blue = [m, m, x, chroma, chroma, x][index];

    return {
      r: Math.round(red * 255),
      g: Math.round(green * 255),
      b: Math.round(blue * 255),
      a: hsva.a };

  }

  /**
   * Convert RGBA to HSVA.
   * @param {object} rgba Red, green, blue and alpha values.
   * @return {object} Hue, saturation, value and alpha values.
   */
  function RGBAtoHSVA(rgba) {
    var red = rgba.r / 255;
    var green = rgba.g / 255;
    var blue = rgba.b / 255;
    var xmax = Math.max(red, green, blue);
    var xmin = Math.min(red, green, blue);
    var chroma = xmax - xmin;
    var value = xmax;
    var hue = 0;
    var saturation = 0;

    if (chroma) {
      if (xmax === red) {hue = (green - blue) / chroma;}
      if (xmax === green) {hue = 2 + (blue - red) / chroma;}
      if (xmax === blue) {hue = 4 + (red - green) / chroma;}
      if (xmax) {saturation = chroma / xmax;}
    }

    hue = Math.floor(hue * 60);

    return {
      h: hue < 0 ? hue + 360 : hue,
      s: Math.round(saturation * 100),
      v: Math.round(value * 100),
      a: rgba.a };

  }

  /**
   * Parse a string to RGBA.
   * @param {string} str String representing a color.
   * @return {object} Red, green, blue and alpha values.
   */
  function strToRGBA(str) {
    var regex = /^((rgba)|rgb)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i;
    var match, rgba;

    // Default to black for invalid color strings
    ctx.fillStyle = '#000';

    // Use canvas to convert the string to a valid color string 
    ctx.fillStyle = str;
    match = regex.exec(ctx.fillStyle);

    if (match) {
      rgba = {
        r: match[3] * 1,
        g: match[4] * 1,
        b: match[5] * 1,
        a: match[6] * 1 };


    } else {
      match = ctx.fillStyle.replace('#', '').match(/.{2}/g).map(function (h) {return parseInt(h, 16);});
      rgba = {
        r: match[0],
        g: match[1],
        b: match[2],
        a: 1 };

    }

    return rgba;
  }

  /**
   * Convert RGBA to Hex.
   * @param {object} rgba Red, green, blue and alpha values.
   * @return {string} Hex color string.
   */
  function RGBAToHex(rgba) {
    var R = rgba.r.toString(16);
    var G = rgba.g.toString(16);
    var B = rgba.b.toString(16);
    var A = '';

    if (rgba.r < 16) {
      R = '0' + R;
    }

    if (rgba.g < 16) {
      G = '0' + G;
    }

    if (rgba.b < 16) {
      B = '0' + B;
    }

    if (rgba.a < 1) {
      var alpha = rgba.a * 255 | 0;
      A = alpha.toString(16);

      if (alpha < 16) {
        A = '0' + A;
      }
    }

    return '#' + R + G + B + A;
  }

  /**
   * Convert RGBA values to a CSS rgb/rgba string.
   * @param {object} rgba Red, green, blue and alpha values.
   * @return {string} CSS color string.
   */
  function RGBAToStr(rgba) {
    if (rgba.a === 1) {
      return "rgb(" + rgba.r + "," + rgba.g + "," + rgba.b + ")";
    } else {
      return "rgba(" + rgba.r + "," + rgba.g + "," + rgba.b + "," + rgba.a + ")";
    }
  }

  /**
   * Init the color picker.
   */
  function init() {
    // Render the UI
    picker = document.createElement('div');
    picker.setAttribute('id', 'clr-picker');
    picker.setAttribute('class', "clr-picker clr-" + settings.theme);
    picker.innerHTML =
    "<input id=\"clr-color-value\" class=\"clr-color\" type=\"text\" value=\"\" aria-label=\"" + settings.a11y.input + "\">" + ("<div id=\"clr-color-area\" class=\"clr-gradient\" role=\"application\" aria-label=\"" +
    settings.a11y.instruction + "\">") +
    '<div id="clr-color-marker" class="clr-marker" tabindex="0"></div>' +
    '</div>' +
    '<div class="clr-hue">' + ("<input id=\"clr-hue-slider\" type=\"range\" min=\"0\" max=\"360\" step=\"1\" aria-label=\"" +
    settings.a11y.hueSlider + "\">") +
    '<div id="clr-hue-marker"></div>' +
    '</div>' +
    '<div class="clr-alpha">' + ("<input id=\"clr-alpha-slider\" type=\"range\" min=\"0\" max=\"100\" step=\"1\" aria-label=\"" +
    settings.a11y.alphaSlider + "\">") +
    '<div id="clr-alpha-marker"></div>' +
    '</div>' +
    '<div id="clr-swatches" class="clr-swatches"></div>' + ("<button id=\"clr-color-preview\" class=\"clr-preview\" aria-label=\"" +
    settings.a11y.close + "\"></button>") + ("<span id=\"clr-open-label\" hidden>" +
    settings.a11y.open + "</span>") + ("<span id=\"clr-swatch-label\" hidden>" +
    settings.a11y.swatch + "</span>");

    // Append the color picker to the DOM
    document.body.appendChild(picker);

    // Reference the UI elements
    colorArea = getEl('clr-color-area');
    colorMarker = getEl('clr-color-marker');
    colorPreview = getEl('clr-color-preview');
    colorValue = getEl('clr-color-value');
    hueSlider = getEl('clr-hue-slider');
    hueMarker = getEl('clr-hue-marker');
    alphaSlider = getEl('clr-alpha-slider');
    alphaMarker = getEl('clr-alpha-marker');

    // Attach the picker to the default selector
    attachFields(settings.el);
    wrapFields(settings.el);

    addListener(picker, 'mousedown', function (event) {
      picker.classList.remove('clr-keyboard-nav');
      event.stopPropagation();
    });

    addListener(colorArea, 'mousedown', function (event) {
      addListener(document, 'mousemove', moveMarker);
    });

    addListener(colorMarker, 'mousedown', function (event) {
      addListener(document, 'mousemove', moveMarker);
    });

    addListener(colorValue, 'change', function (event) {
      setColorFromStr(colorValue.value);
      pickColor();
    });

    addListener(colorPreview, 'click', function (event) {
      closePicker(true);
    });

    addListener(picker, 'click', '.clr-swatches button', function (event) {
      setColorFromStr(event.target.style.color);
      pickColor();
    });

    addListener(document, 'mouseup', function (event) {
      document.removeEventListener('mousemove', moveMarker);
    });

    addListener(document, 'mousedown', function (event) {
      picker.classList.remove('clr-keyboard-nav');
      closePicker(true);
    });

    addListener(document, 'keydown', function (event) {
      if (event.key === 'Escape') {
        closePicker(true);
      } else if (event.key === 'Tab') {
        picker.classList.add('clr-keyboard-nav');
      }
    });

    addListener(document, 'click', '.clr-field button', function (event) {
      event.target.nextElementSibling.dispatchEvent(new Event('click', { bubbles: true }));
    });

    addListener(colorMarker, 'keydown', function (event) {
      var movements = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0] };


      if (Object.keys(movements).indexOf(event.key) !== -1) {
        moveMarkerOnKeydown.apply(void 0, movements[event.key]);
        event.preventDefault();
      }
    });

    addListener(colorArea, 'click', moveMarker);
    addListener(hueSlider, 'input', setHue);
    addListener(alphaSlider, 'input', setAlpha);
  }

  /**
   * Shortcut for getElementById to optimize the minified JS.
   * @param {string} id The element id.
   * @return {object} The DOM element with the provided id.
   */
  function getEl(id) {
    return document.getElementById(id);
  }

  /**
   * Shortcut for addEventListener to optimize the minified JS.
   * @param {object} context The context to which the listener is attached.
   * @param {string} type Event type.
   * @param {(string|function)} selector Event target if delegation is used, event handler if not.
   * @param {function} [fn] Event handler if delegation is used.
   */
  function addListener(context, type, selector, fn) {
    var matches = Element.prototype.matches || Element.prototype.msMatchesSelector;

    // Delegate event to the target of the selector
    if (typeof selector === 'string') {
      context.addEventListener(type, function (event) {
        if (matches.call(event.target, selector)) {
          fn.call(event.target, event);
        }
      });

      // If the selector is not a string then it's a function
      // in which case we need regular event listener
    } else {
      fn = selector;
      context.addEventListener(type, fn);
    }
  }

  /**
   * Call a function only when the DOM is ready.
   * @param {function} fn The function to call.
   * @param {array} args Arguments to pass to the function.
   */
  function DOMReady(fn, args) {
    args = args !== undefined ? args : [];

    if (document.readyState !== 'loading') {
      fn.apply(void 0, args);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        fn.apply(void 0, args);
      });
    }
  }

  // Polyfill for Nodelist.forEach
  if (NodeList !== undefined && NodeList.prototype && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }

  // Expose the color picker to the global scope
  window.Coloris = function () {
    var methods = {
      set: configure,
      wrap: wrapFields,
      close: closePicker };


    function Coloris(options) {
      DOMReady(function () {
        if (options) {
          if (typeof options === 'string') {
            attachFields(options);
          } else {
            configure(options);
          }
        }
      });
    }var _loop = function _loop(

    key) {
      Coloris[key] = function () {for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {args[_key] = arguments[_key];}
        DOMReady(methods[key], args);
      };};for (var key in methods) {_loop(key);
    }

    return Coloris;
  }();

  // Init the color picker when the DOM is ready
  DOMReady(init);

})(window, document, Math);