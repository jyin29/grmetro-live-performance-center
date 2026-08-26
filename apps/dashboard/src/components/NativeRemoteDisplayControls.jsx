function NativeCommandForm({ displayId, action, children, index, disabled = false }) {
  const path = `/api/v1/presentation/${encodeURIComponent(displayId)}/action/${encodeURIComponent(action)}`;
  return <form className="remote-native-command" action={path} method="get" target="remote-command-sink">
    {Number.isInteger(index) && <input type="hidden" name="index" value={index} />}
    <input type="hidden" name="_" value={Date.now()} />
    <button type="submit" disabled={disabled}>{children}</button>
  </form>;
}

export function NativeRemoteDisplayControls({ controller }) {
  return <div className="operations-display-actions" aria-label={`Controls for ${controller.displayName}`}>
    <iframe className="remote-command-sink" name="remote-command-sink" title="Remote command response" aria-hidden="true" />

    <div className="display-direction">
      <NativeCommandForm displayId={controller.displayId} action="previous">
        <span className="display-direction__arrow">←</span><span>Previous</span>
      </NativeCommandForm>
      <NativeCommandForm displayId={controller.displayId} action="next">
        <span>Next</span><span className="display-direction__arrow display-direction__arrow--next">→</span>
      </NativeCommandForm>
    </div>

    <div className="display-playback">
      <NativeCommandForm displayId={controller.displayId} action="pause" disabled={!controller.isRunning}>Ⅱ <span>Pause</span></NativeCommandForm>
      <NativeCommandForm displayId={controller.displayId} action="resume" disabled={controller.isRunning}>▶ <span>Resume</span></NativeCommandForm>
    </div>

    <NativeCommandForm displayId={controller.displayId} action="restart">↻ Restart Rotation</NativeCommandForm>

    <div className="operations-slide-buttons">
      {controller.slides.map((slide, index) => <NativeCommandForm key={slide.id} displayId={controller.displayId} action="select" index={index}>
        <small>{index + 1}</small><span>{slide.label}</span>
      </NativeCommandForm>)}
    </div>
  </div>;
}
