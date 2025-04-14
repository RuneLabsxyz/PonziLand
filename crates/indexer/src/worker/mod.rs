use std::cell::Cell;

use apalis::prelude::Monitor;

pub struct MonitorManager {
    monitor: Cell<Monitor>,
}

impl Default for MonitorManager {
    fn default() -> Self {
        Self::new()
    }
}

impl MonitorManager {
    pub fn new() -> Self {
        Self {
            monitor: Cell::new(Monitor::new()),
        }
    }

    pub fn build(self) -> Monitor {
        self.monitor.take()
    }

    pub fn register(&self, update: impl FnOnce(Monitor) -> Monitor) {
        self.monitor.set(update(self.monitor.take()));
    }
}
