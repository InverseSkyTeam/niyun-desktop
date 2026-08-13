use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub static WORKSPACE: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn set_root(path: PathBuf) {
    if let Ok(mut w) = WORKSPACE.lock() {
        *w = Some(path);
    }
}

pub fn get_root() -> Option<PathBuf> {
    WORKSPACE.lock().ok().and_then(|w| w.clone())
}

fn not_found() -> std::io::Error {
    std::io::Error::new(std::io::ErrorKind::NotFound, "路径不存在")
}

fn join_suffix(canon: PathBuf, suffix: &[PathBuf]) -> PathBuf {
    let mut result = canon;
    for s in suffix.iter().rev() {
        result = result.join(s);
    }
    result
}

fn climb_to_parent<'a>(current: &'a Path, suffix: &mut Vec<PathBuf>) -> std::io::Result<&'a Path> {
    if let Some(name) = current.file_name() {
        suffix.push(PathBuf::from(name));
    }
    current.parent().ok_or_else(not_found)
}

fn resolve_ancestor(p: PathBuf) -> std::io::Result<PathBuf> {
    let mut current: &Path = &p;
    let mut suffix: Vec<PathBuf> = Vec::new();
    loop {
        match current.canonicalize() {
            Ok(canon) => return Ok(join_suffix(canon, &suffix)),
            Err(_) => current = climb_to_parent(current, &mut suffix)?,
        }
    }
}

fn build_candidate(root_canon: &Path, path: &str) -> PathBuf {
    if path.is_empty() {
        return root_canon.to_path_buf();
    }
    let p = Path::new(path);
    if p.is_absolute() {
        p.to_path_buf()
    } else {
        root_canon.join(p)
    }
}

pub fn resolve_in_workspace(path: &str) -> Result<PathBuf, String> {
    let root = get_root().ok_or("尚未设置工作目录，请先在设置中选择工作目录")?;
    let root_canon = root
        .canonicalize()
        .map_err(|e| format!("无法解析工作目录: {e}"))?;

    let candidate = build_candidate(&root_canon, path);

    let canon = candidate
        .canonicalize()
        .or_else(|_| resolve_ancestor(candidate))
        .map_err(|e| format!("路径无效: {e}"))?;

    if canon.starts_with(&root_canon) {
        Ok(canon)
    } else {
        Err(format!(
            "拒绝访问：路径 {path} 不在工作目录 {} 内",
            root_canon.display()
        ))
    }
}
