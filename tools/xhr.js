function load_script(src, fn) {
  var xhr = XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
  var head = document.head || document.getElementByTagName('head')[0];
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4)
      fn(xhr.responseText);
  };
  xhr.open('GET', src);
  xhr.send();
}
