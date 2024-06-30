
importScripts("/gloom/gloom.config.js");
importScripts( __gloom$config.bundle || "/gloom/gloom.bundle.js")
importScripts( __gloom$config.worker || "/gloom/gloom.worker.js");
// add transpport paths below if a tranport is being registered because bare-mux is selected.

const Gloom = new GloomWorker();


self.addEventListener('fetch', async (event) => {
    if (Gloom.route(event)) {
        return await Gloom.fetch(event);
    }
    return await fetch(event.request)
});