import os

""" 
Renames the filenames within the same directory to be Unix friendly
(1) Changes spaces to hyphens
(2) Makes lowercase (not a Unix requirement, just looks better ;)
Usage:
python rename.py
"""

path =  os.getcwd()
filenames = os.listdir(path)
i=0
for filename in filenames:
	if filename != "rename.py":
		os.rename(filename, str(i)+".mid")
		i=i+1