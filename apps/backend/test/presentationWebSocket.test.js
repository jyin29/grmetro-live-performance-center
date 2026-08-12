"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const { WebSocket } = require("ws");
const { PRESENTATION_COMMANDS } = require("../../../shared/presentation");
const { createPresentationManager } = require("../src/presentation/presentationManager");
const { createPresentationCommandBus } = require("../src/presentation/presentationCommandBus");
const { createPresentationWebSocket } = require("../src/presentation/presentationWebSocket");

function nextMessage(socket) { return new Promise((resolve) => socket.once("message", (raw) => resolve(JSON.parse(raw.toString())))); }
async function setup() {
  const server = http.createServer();
  const manager = createPresentationManager({ displays: [{ id: "main", name: "Main", presentationProfile: "standard" },
    { id: "dispatch", name: "Dispatch", presentationProfile: "standard" }], slideCount: 5, rotationMilliseconds: 30000 });
  const gateway = createPresentationWebSocket({ server, manager,
    commandBus: createPresentationCommandBus({ handleCommand: manager.handleCommand }), logger: { warn() {} } });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `ws://127.0.0.1:${server.address().port}/ws/presentation`;
  async function connect(displayId, clientType) {
    const socket = new WebSocket(`${base}?displayId=${displayId}&clientType=${clientType}`);
    const initial = await nextMessage(socket);
    return { socket, initial };
  }
  async function close() { gateway.close(); manager.destroy(); await new Promise((resolve) => server.close(resolve)); }
  return { connect, close };
}

test("two displays and multiple remotes receive current state with targeted broadcast isolation", async () => {
  const environment = await setup();
  const displayA = await environment.connect("main", "display");
  const displayB = await environment.connect("main", "display");
  const remoteA = await environment.connect("main", "remote");
  const remoteB = await environment.connect("main", "remote");
  const dispatch = await environment.connect("dispatch", "display");
  assert.equal(displayA.initial.state.activeSlideIndex, 0);
  const updates = [displayA, displayB, remoteA, remoteB].map(({ socket }) => nextMessage(socket));
  remoteA.socket.send(JSON.stringify({ type: PRESENTATION_COMMANDS.NEXT_SLIDE, displayId: "main", payload: {} }));
  assert.deepEqual((await Promise.all(updates)).map(({ state }) => state.activeSlideIndex), [1, 1, 1, 1]);
  const noDispatchUpdate = await Promise.race([nextMessage(dispatch.socket).then(() => false), new Promise((resolve) => setTimeout(() => resolve(true), 30))]);
  assert.equal(noDispatchUpdate, true);
  const reconnect = await environment.connect("main", "display");
  assert.equal(reconnect.initial.state.activeSlideIndex, 1);
  for (const { socket } of [displayA, displayB, remoteA, remoteB, dispatch, reconnect]) socket.close();
  await environment.close();
});

test("invalid WebSocket commands return safe errors", async () => {
  const environment = await setup();
  const remote = await environment.connect("main", "remote");
  remote.socket.send(JSON.stringify({ type: "invalid", displayId: "main", payload: {} }));
  assert.match((await nextMessage(remote.socket)).message, /Invalid presentation command/);
  remote.socket.send(JSON.stringify({ type: PRESENTATION_COMMANDS.NEXT_SLIDE, displayId: "dispatch", payload: {} }));
  assert.match((await nextMessage(remote.socket)).message, /does not match/);
  remote.socket.close(); await environment.close();
});
