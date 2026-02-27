/// Content moderation for the chat system.
///
/// Filters slurs and hate speech while allowing common swear words.
/// Uses a static word list — no external API calls.

/// Words that are NOT allowed (slurs, hate speech, targeted harassment).
/// These result in message rejection. This is intentionally non-exhaustive
/// and should be expanded as needed.
const BLOCKED_PATTERNS: &[&str] = &[
    // Racial slurs
    "nigger", "nigga", "chink", "gook", "spic", "kike", "wetback", "beaner", "coon", "darkie",
    "redskin", "paki", // Homophobic slurs
    "faggot", "fag", "dyke", "tranny", // Ableist slurs
    "retard", "retarded", // Other targeted hate
    "nazi",
];

/// Check if a message contains blocked content.
///
/// Returns `Some(matched_word)` if blocked, `None` if clean.
#[must_use]
pub fn check_message(content: &str) -> Option<&'static str> {
    let lower = content.to_lowercase();
    // Remove common letter substitutions
    let normalized = normalize_text(&lower);

    for &pattern in BLOCKED_PATTERNS {
        if contains_word(&normalized, pattern) {
            return Some(pattern);
        }
    }
    None
}

/// Normalize text to catch common evasion techniques.
fn normalize_text(text: &str) -> String {
    text.chars()
        .map(|c| match c {
            '0' => 'o',
            '1' | '!' => 'i',
            '3' => 'e',
            '4' => 'a',
            '5' => 's',
            '7' => 't',
            '@' => 'a',
            '$' => 's',
            _ => c,
        })
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect()
}

/// Check if the normalized text contains the pattern as a word boundary match.
fn contains_word(text: &str, pattern: &str) -> bool {
    // Simple substring match on normalized text
    // This catches: "n i g g e r", "n1gg3r", "NIGGER", etc.
    let stripped: String = text.chars().filter(|c| !c.is_whitespace()).collect();
    if stripped.contains(pattern) {
        return true;
    }
    // Also check the original (with spaces) for the pattern
    text.contains(pattern)
}

/// Rate limiting configuration.
pub struct RateLimitConfig {
    /// Maximum messages per window.
    pub max_messages: i64,
    /// Window size in seconds.
    pub window_seconds: i64,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            max_messages: 5,
            window_seconds: 10,
        }
    }
}

/// Maximum message length in characters.
pub const MAX_MESSAGE_LENGTH: usize = 500;

/// Minimum message length (prevent empty/whitespace-only messages).
pub const MIN_MESSAGE_LENGTH: usize = 1;

/// Validate a message before sending.
///
/// Returns `Ok(())` if valid, `Err(reason)` if invalid.
///
/// # Errors
/// Returns a string describing why the message was rejected.
pub fn validate_message(content: &str) -> Result<(), &'static str> {
    let trimmed = content.trim();

    if trimmed.len() < MIN_MESSAGE_LENGTH {
        return Err("Message cannot be empty");
    }

    if trimmed.len() > MAX_MESSAGE_LENGTH {
        return Err("Message exceeds maximum length");
    }

    if let Some(_matched) = check_message(trimmed) {
        return Err("Message contains prohibited content");
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_allows_normal_swear_words() {
        // These should be allowed
        assert!(check_message("what the fuck").is_none());
        assert!(check_message("this is shit").is_none());
        assert!(check_message("damn it").is_none());
        assert!(check_message("you asshole").is_none());
        assert!(check_message("hell yeah").is_none());
        assert!(check_message("bullshit").is_none());
        assert!(check_message("bitch please").is_none());
    }

    #[test]
    fn test_blocks_slurs() {
        assert!(check_message("nigger").is_some());
        assert!(check_message("NIGGER").is_some());
        assert!(check_message("faggot").is_some());
        assert!(check_message("chink").is_some());
        assert!(check_message("retard").is_some());
    }

    #[test]
    fn test_blocks_evasion_attempts() {
        assert!(check_message("n1gg3r").is_some());
        assert!(check_message("f4gg0t").is_some());
        assert!(check_message("r3tard").is_some());
    }

    #[test]
    fn test_allows_clean_messages() {
        assert!(check_message("hello world").is_none());
        assert!(check_message("nice trade!").is_none());
        assert!(check_message("gm everyone").is_none());
        assert!(check_message("who wants to buy land?").is_none());
    }

    #[test]
    fn test_validate_message_length() {
        assert!(validate_message("").is_err());
        assert!(validate_message("   ").is_err());
        assert!(validate_message("hi").is_ok());
        assert!(validate_message(&"a".repeat(501)).is_err());
        assert!(validate_message(&"a".repeat(500)).is_ok());
    }

    #[test]
    fn test_validate_message_content() {
        assert!(validate_message("hello").is_ok());
        assert!(validate_message("nigger").is_err());
    }
}
