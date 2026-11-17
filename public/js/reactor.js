export function setReactorState(state) {
  document.body.dataset.state = state;
  const label = document.getElementById('stateLabel');
  if (label) label.textContent = state;
}
