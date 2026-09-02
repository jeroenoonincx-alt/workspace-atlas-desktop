use std::fs;
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

#[tauri::command]
fn smoke_mode() -> bool {
    std::env::var("ATLAS_SMOKE").map(|v| v == "1").unwrap_or(false)
}

#[tauri::command]
fn smoke_report(payload: String) -> Result<(), String> {
    if !smoke_mode() {
        return Err("Rooktestmodus is niet actief.".into());
    }
    let path = std::env::temp_dir().join("workspace-atlas-smoke.json");
    fs::write(path, payload).map_err(|e| format!("Rooktestrapport kon niet worden geschreven: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            choose_exe,
            launch_target,
            smoke_mode,
            smoke_report
        ])
        .run(tauri::generate_context!())
        .expect("fout tijdens starten van Workspace Atlas");
}
