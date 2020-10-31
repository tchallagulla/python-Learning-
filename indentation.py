#example 1: indentation plays a crucial role in python. the space indicate a block of code.
#if indentation is given then python throws an indentation error.
#this is a block of code
if (5<2):
 print("Five is greater than two!")

#example 2: the spaces has to atleast one and can be more than one.
if (5<2):
 print("Five is greater than two!")
if (5<2):
  print("Five is greater than two!")


#example 3: But the same spaces has to be maintained in the same block of code. 
#right way
if (5<2):
 print("Five is greater than two!")
 print("Five is greater than two!")
#wrong way
#error type - syntax error 
if (5<2):
 print("Five is greater than two!")
  print("Five is greater than two!")