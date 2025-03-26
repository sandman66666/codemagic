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
summary, tree, content = gitingest.ingest("https://github.com/TalyaBsh/test1.git")
"""
    summary example:
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

#ingest local directory:
summary, tree, content = gitingest.ingest("path_to_directory/test1")
"""
    summary example:
    Repository: path_to_directory/test1
    Files analyzed: 1

    tree example:
    Directory structure:
    └── path_to_director/test1/
        └── example-text.txt

    content example:
    ================================================
    File: example-text.txt
    ================================================
    blah blah blah
"""