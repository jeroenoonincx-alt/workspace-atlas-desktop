use std::path::Path;
use std::process::Command;

#[tauri::command]
fn choose_exe() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("Windows-programma", &["exe"])
        .pick_file()
        .map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
fn launch_target(exe_path: String, app_url: String, url: String) -> Result<String, String> {
    let exe = exe_path.trim();
    let app = app_url.trim();
    let web = url.trim();

    if !exe.is_empty() {
        if !Path::new(exe).is_file() {
            return Err("Het gekozen .exe-bestand bestaat niet meer. Kies het programma opnieuw.".into());
        }
        Command::new(exe)
            .spawn()
            .map_err(|e| format!("Programma kon niet worden gestart: {e}"))?;
        return Ok("Desktop-app".into());
    }

    if !app.is_empty() {
        open::that_detached(app)
            .map_err(|e| format!("App-link kon niet worden geopend: {e}"))?;
        return Ok("App".into());
    }

    if !web.is_empty() {
        open::that_detached(web)
            .map_err(|e| format!("Website kon niet worden geopend: {e}"))?;
        return Ok("Website".into());
    }

    Err("Geen geldige startoptie ingesteld.".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![choose_exe, launch_target])
        .run(tauri::generate_context!())
        .expect("fout tijdens starten van Workspace Atlas");
}
