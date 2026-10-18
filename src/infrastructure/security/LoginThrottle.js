'use strict';

const FIVE_MINUTES = 5 * 60 * 1000;

/** Bloqueia o login após 3 falhas seguidas (como o original), por 5 minutos. */
class LoginThrottle {
  constructor({ maxFailures = 3, windowMs = FIVE_MINUTES, now = Date.now } = {}) {
    this.maxFailures = maxFailures;
    this.windowMs = windowMs;
    this.now = now;
    this.failures = new Map();
  }

  isBlocked(key) {
    const entry = this.failures.get(key);
    return !!entry && entry.count >= this.maxFailures && this.now() - entry.lastAt < this.windowMs;
  }

  registerFailure(key) {
    const entry = this.failures.get(key);
    const stillCounting = entry && this.now() - entry.lastAt < this.windowMs;
    this.failures.set(key, { count: stillCounting ? entry.count + 1 : 1, lastAt: this.now() });
  }

  reset(key) {
    this.failures.delete(key);
  }
}

module.exports = LoginThrottle;
