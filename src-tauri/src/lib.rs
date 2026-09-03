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
fn save_backup(filename: String, contents: String) -> Result<Option<String>, String> {
    let suggested = if filename.trim().is_empty() {
        "Workspace_Atlas_for_Desktop_Start_backup.json"
    } else {
        filename.trim()
    };

    let Some(path) = rfd::FileDialog::new()
        .add_filter("Workspace Atlas back-up", &["json"])
        .set_file_name(suggested)
        .save_file()
    else {
        return Ok(None);
    };

    fs::write(&path, contents.as_bytes())
        .map_err(|e| format!("Back-upbestand kon niet worden opgeslagen: {e}"))?;

    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn launch_target(exe_path: String, app_url: String, url: String) -> Result<String, String> {
    let exe = exe_path.trim();
    let app = app_url.trim();
    let web = url.trim();

    if exe.is_empty() && app.is_empty() && web.is_empty() {
        return Err("Geen geldige startoptie ingesteld.".into());
    }

    let mut errors = Vec::new();

    if !exe.is_empty() {
        if Path::new(exe).is_file() {
            match Command::new(exe).spawn() {
                Ok(_) => return Ok("Desktop-app".into()),
                Err(e) => errors.push(format!("Programma kon niet worden gestart: {e}")),
            }
        } else {
            errors.push("Het gekozen .exe-bestand bestaat niet meer.".into());
        }
    }

    if !app.is_empty() {
        match open::that_detached(app) {
            Ok(_) => return Ok("App".into()),
            Err(e) => errors.push(format!("App-link kon niet worden geopend: {e}")),
        }
    }

    if !web.is_empty() {
        match open::that_detached(web) {
            Ok(_) => return Ok("Website".into()),
            Err(e) => errors.push(format!("Website kon niet worden geopend: {e}")),
        }
    }

    Err(errors.join(" | "))
}

#[tauri::command]
fn smoke_mode() -> bool {
    std::env::var("ATLAS_SMOKE")
        .map(|v| v == "1")
        .unwrap_or(false)
}

#[tauri::command]
fn smoke_report(payload: String) -> Result<(), String> {
    if !smoke_mode() {
        return Err("Rooktestmodus is niet actief.".into());
    }
    let path = std::env::temp_dir().join("workspace-atlas-smoke.json");
    fs::write(path, payload)
        .map_err(|e| format!("Rooktestrapport kon niet worden geschreven: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            choose_exe,
            save_backup,
            launch_target,
            smoke_mode,
            smoke_report
        ])
        .run(tauri::generate_context!())
        .expect("fout tijdens starten van Workspace Atlas");
}
