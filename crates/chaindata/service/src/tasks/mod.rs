use std::sync::{Arc, Mutex};

use tokio::sync::oneshot;

use tracing::{debug, error, info};

pub mod event_listener;
pub mod model_listener;
pub mod simple_position_listener;

// TODO(Red): Migrate this to a dedicated crate, as we could add more informations later.

/// A task is an utility trait that is used to factorize some of the work required for
/// each indexer subsystem, as they are a task that is handled by tokio, and must be kept alive.
#[async_trait::async_trait]
pub trait Task: Sized + Send + Sync + 'static {
    const NAME: &'static str;

    async fn do_task(self: Arc<Self>, stop_channel: oneshot::Receiver<()>);

    fn wrap(self) -> TaskWrapper<Self> {
        TaskWrapper::new(self)
    }
}

pub struct TaskWrapper<T: Task> {
    stop_handle: Mutex<Option<oneshot::Sender<()>>>,
    task: Arc<T>,
}

impl<T: Task + 'static> TaskWrapper<T> {
    pub fn new(task: T) -> Self {
        Self {
            stop_handle: Mutex::new(None),
            task: Arc::new(task),
        }
    }

    pub fn start(&self) {
        let (tx, rx) = oneshot::channel();

        // Store the sender in the mutex
        if let Ok(mut guard) = self.stop_handle.lock() {
            if guard.is_some() {
                info!("{} is already started", T::NAME);
                return;
            }
            *guard = Some(tx);
        } else {
            info!("Failed to acquire lock for starting {}", T::NAME);
            return;
        }
        let task = self.task.clone();

        tokio::spawn(async {
            T::do_task(task, rx).await;
        });
    }

    pub fn stop(&self) {
        // Acquire the lock on the stop handle
        if let Ok(mut guard) = self.stop_handle.lock() {
            // Take the sender out of the Option (replacing it with None)
            if let Some(sender) = guard.take() {
                // Send the stop signal, ignoring errors if the receiver was dropped
                let _ = sender.send(());
                debug!("Stop signal sent to {}", T::NAME);
            } else {
                info!("{} is already stopped.", T::NAME);
            }
        } else {
            error!("Cannot stop {}, impossible to acquire lock", T::NAME);
        }
    }
}
