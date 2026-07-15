# Security policy

## Supported versions

Security fixes are provided for the latest `0.2.x` release. Version `0.1.0` is retained for
historical reproducibility but should not be used for new installations after `0.2.0` is released.

## Reporting a vulnerability

Please use the repository's private GitHub security-advisory reporting flow. If that is not
available, email the maintainer address listed in `package.json`. Do not include secrets,
credentials, or exploit data in a public issue.

Include the affected version, platform, install command, expected behavior, observed behavior,
and a minimal reproduction. Reports will be acknowledged and assessed before public disclosure.

## Installer trust boundary

The installer writes only to explicitly selected user-skill directories or an explicitly selected
existing project. It rejects linked or escaping destination paths and updates shared instruction
files only inside its own exact managed block. These checks protect against static malicious path
layouts; they do not defend against a privileged local process racing filesystem operations.
