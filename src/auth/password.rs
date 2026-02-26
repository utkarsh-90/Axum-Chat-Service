use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand_core::OsRng;

use crate::error::AppError;

pub fn hash_password(plain: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let hash = argon2
        .hash_password(plain.as_bytes(), &salt)
        .map_err(|e| AppError::Password(e.to_string()))?;

    Ok(hash.to_string())
}

pub fn verify_password(hash: &str, password: &str) -> Result<bool, AppError> {
    let parsed_hash =
        PasswordHash::new(hash).map_err(|e| AppError::Password(e.to_string()))?;
    let argon2 = Argon2::default();

    let result = argon2
        .verify_password(password.as_bytes(), &parsed_hash)
        .map(|_| true)
        .or_else(|err| {
            if matches!(err, argon2::password_hash::Error::Password) {
                Ok(false)
            } else {
                Err(AppError::Password(err.to_string()))
            }
        })?;

    Ok(result)
}

