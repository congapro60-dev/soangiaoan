$lines = Get-Content HANDOFF.md -Encoding UTF8
$lines[0..($lines.Count - 6)] | Set-Content HANDOFF.md -Encoding UTF8
