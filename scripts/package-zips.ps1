Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = "C:\Users\praha\Downloads\micro_project-2"
$staging = Join-Path $baseDir "staging_zips"

if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Path "$staging\daa", "$staging\flat", "$staging\coa" -Force | Out-Null

# --- 1. DAA Package ---
Write-Host "Staging DAA..."
Copy-Item "$baseDir\reports\DAA_MICRO_PROJECT_REPORT.pdf" "$staging\daa\"
Copy-Item "$baseDir\reports\DAA_MICRO_PROJECT_REPORT.md" "$staging\daa\"
Copy-Item "$baseDir\screenshots\02_daa_huffman.png" "$staging\daa\DAA_Huffman_Screenshot.png"
Copy-Item "$baseDir\docs\DAA_HUFFMAN.md" "$staging\daa\"
Copy-Item "$baseDir\README.md" "$staging\daa\"

$daaBackend = "$staging\daa\backend"
New-Item -ItemType Directory -Path "$daaBackend\app\algorithms", "$daaBackend\app\api", "$daaBackend\app\core", "$daaBackend\tests" -Force | Out-Null
Copy-Item "$baseDir\backend\app\algorithms\*.py" "$daaBackend\app\algorithms\"
Copy-Item "$baseDir\backend\app\api\*.py" "$daaBackend\app\api\"
Copy-Item "$baseDir\backend\app\core\*.py" "$daaBackend\app\core\"
Copy-Item "$baseDir\backend\app\main.py" "$daaBackend\app\"
Copy-Item "$baseDir\backend\app\__init__.py" "$daaBackend\app\"
Copy-Item "$baseDir\backend\tests\*.py" "$daaBackend\tests\"
Copy-Item "$baseDir\backend\requirements.txt" "$daaBackend\"
Copy-Item "$baseDir\backend\.env.example" "$daaBackend\"
Copy-Item "$baseDir\backend\pytest.ini" "$daaBackend\"
Copy-Item "$baseDir\backend\README.md" "$daaBackend\"

# --- 2. FLAT Package ---
Write-Host "Staging FLAT..."
Copy-Item "$baseDir\reports\FLAT_MICRO_PROJECT_REPORT.pdf" "$staging\flat\"
Copy-Item "$baseDir\reports\FLAT_MICRO_PROJECT_REPORT.md" "$staging\flat\"
Copy-Item "$baseDir\screenshots\03_flat_automata.png" "$staging\flat\FLAT_Automata_Screenshot.png"
Copy-Item "$baseDir\docs\FLAT_AUTOMATA.md" "$staging\flat\"
Copy-Item "$baseDir\README.md" "$staging\flat\"
Copy-Item "$baseDir\package.json" "$staging\flat\"

New-Item -ItemType Directory -Path "$staging\flat\src\lib\flat", "$staging\flat\modules\flat", "$staging\flat\tests", "$staging\flat\ui_lab" -Force | Out-Null
Copy-Item "$baseDir\src\lib\flat\*.js" "$staging\flat\src\lib\flat\"
Copy-Item "$baseDir\modules\flat\*.js" "$staging\flat\modules\flat\"
Copy-Item "$baseDir\tests\flat-automata.test.js" "$staging\flat\tests\"
Copy-Item "$baseDir\modules\tests\flat*.test.js" "$staging\flat\tests\"
Copy-Item "$baseDir\frontend\src\app\flat\page.js" "$staging\flat\ui_lab\flat_page.js"

# --- 3. COA Package ---
Write-Host "Staging COA..."
Copy-Item "$baseDir\reports\COA_MICRO_PROJECT_REPORT.pdf" "$staging\coa\"
Copy-Item "$baseDir\reports\COA_MICRO_PROJECT_REPORT.md" "$staging\coa\"
Copy-Item "$baseDir\screenshots\04_coa_architecture.png" "$staging\coa\COA_Architecture_Screenshot.png"
Copy-Item "$baseDir\docs\COA_MEMORY.md" "$staging\coa\"
Copy-Item "$baseDir\README.md" "$staging\coa\"
Copy-Item "$baseDir\package.json" "$staging\coa\"

New-Item -ItemType Directory -Path "$staging\coa\src\lib\coa", "$staging\coa\modules\coa", "$staging\coa\tests", "$staging\coa\ui_lab" -Force | Out-Null
Copy-Item "$baseDir\src\lib\coa\*.js" "$staging\coa\src\lib\coa\"
Copy-Item "$baseDir\modules\coa\*.js" "$staging\coa\modules\coa\"
Copy-Item "$baseDir\tests\coa-simulator.test.js" "$staging\coa\tests\"
Copy-Item "$baseDir\modules\tests\coa*.test.js" "$staging\coa\tests\"
Copy-Item "$baseDir\frontend\src\app\coa\page.js" "$staging\coa\ui_lab\coa_page.js"

# Create ZIP archives
Write-Host "Creating ZIP archives..."
$daaZip = Join-Path $baseDir "DAA_Micro_Project.zip"
$flatZip = Join-Path $baseDir "FLAT_Micro_Project.zip"
$coaZip = Join-Path $baseDir "COA_Micro_Project.zip"

if (Test-Path $daaZip) { Remove-Item -Force $daaZip }
if (Test-Path $flatZip) { Remove-Item -Force $flatZip }
if (Test-Path $coaZip) { Remove-Item -Force $coaZip }

[System.IO.Compression.ZipFile]::CreateFromDirectory("$staging\daa", $daaZip)
[System.IO.Compression.ZipFile]::CreateFromDirectory("$staging\flat", $flatZip)
[System.IO.Compression.ZipFile]::CreateFromDirectory("$staging\coa", $coaZip)

Remove-Item -Recurse -Force $staging
Write-Host "SUCCESS: Created $daaZip, $flatZip, $coaZip"

