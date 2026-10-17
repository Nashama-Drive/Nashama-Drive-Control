const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!doctype html><html lang='ar'><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = dom.window.localStorage;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.MutationObserver = dom.window.MutationObserver;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
global.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
global.WebSocket = dom.window.WebSocket;
global.SVGElement = dom.window.SVGElement;
global.confirm = () => true;
dom.window.confirm = () => true;

require("../.tmp-management-smoke.cjs");