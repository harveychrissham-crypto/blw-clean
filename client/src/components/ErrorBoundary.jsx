import { Component } from 'react';

// Catches uncaught render errors anywhere below it in the tree and shows a
// friendly recovery screen instead of leaving the whole app as a blank
// white page. Class component because Suspense/error boundaries currently
// require getDerivedStateFromError, which has no hooks equivalent.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface it to the console for real debugging; nothing else to do
    // here since we don't have an error-reporting service wired up.
    console.error('[ErrorBoundary] caught an error', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-ink-900 px-6 text-center">
        <div className="max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-500">BLW Kenya Zone</p>
          <h1 className="mt-3 text-2xl font-bold text-white">Something went wrong</h1>
          <p className="mt-2 text-sm text-white/55">This page hit an unexpected error. Reloading usually fixes it — if it keeps happening, let us know what you were doing.</p>
          <button type="button" onClick={this.handleReload} className="mt-6 rounded-full bg-gold-500 px-6 py-3 font-semibold text-black">Reload</button>
        </div>
      </div>
    );
  }
}
