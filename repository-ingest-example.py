#import gitingest
import gitingest
import os
"""
This is an example from gitingest's README file:
🚀 Features
Easy code context: Get a text digest from a Git repository URL or a directory
Smart Formatting: Optimized output format for LLM prompts
Statistics about:
File and directory structure
Size of the extract
Token count
CLI tool: Run it as a shell command
Python package: Import it in your code
"""
#ingest repository from url:
#summary, tree, content = gitingest.ingest("https://github.com/TalyaBsh/test1")

#ingest local directory:
temp_folder = "C:\\Users\\talya\\AppData\\Local\\Temp\\codeinsight"#this is an existing folder where system is cloning repository to.
directory = os.listdir("C:\\Users\\talya\\AppData\\Local\\Temp\\codeinsight")
print(directory)
if directory:
    summary, tree, content = gitingest.ingest(temp_folder + "\\" + directory[0])
    """
    saummary example:
    Repository: talyabsh/test1.git
    Files analyzed: 1

    tree example:
    Directory structure:
    └── talyabsh-test1.git/
        └── example-text.txt

    content example:
    ================================================
    File: example-text.txt
    ================================================
    blah blah blah
    """

    with open(temp_folder + "\\summary.txt", 'w') as f:
        f.write(summary)
    with open(temp_folder + "\\tree.txt", 'w') as f:
        f.write(tree)
    with open(temp_folder + "\\content.txt", 'w') as f:
        f.write(content)



