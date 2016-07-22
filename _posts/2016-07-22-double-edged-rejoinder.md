---
layout: default
title:  "My Dissertation Defense"
date:   2016-07-22 12:00:00
categories: abm
--- 

A [cool article](http://jasss.soc.surrey.ac.uk/19/3/8.html) on the philosophy of simulation science is up on JASSS. I like the idea and the execution but I think the fear of "equifinality" is overstated.

Here's the reader digest version.  
Scientist comes up with the verbal theory "minimum wage causes unemployment"; she wants to check if this theory makes sense by building a computational model.  
As she builds the model the scientist needs to make concrete many details she handwaved: how many firms, how many workers, how are they matched, what do they produce, what skillsets are needed, and so on.  
There are many reasonable ways for filling each detail. This generates a large number of equally valid simulations. Many produce the same answer.  
Which one is the "right" model?

![from the paper](http://jasss.soc.surrey.ac.uk/19/3/8/Figure3.png)

The question to me seems fundamentally pointless. If all "reasonable" instantiation of the model produce the same answer then the verbal theory is correct in handwaving those assumptions away. If some instantiations fail (say, if number of firms is set to 1) then the verbal theory is not specific enough and we can highlight why it matters. 

Now the reason the authors are concerned about this is their focus on prediction and therefore data fitting.
What to do if you have a large number of parameters that fit equally well (after usual cross-validation checks)? Not much, really. We simply can't tell with the data we have. Much like we don't have experiments that tell us which string theory is the right one.  
That however is not usually the problem. If our "minimum wage causes unemployment" model predicts the same response both when workers are paid in euros and when paid in dollars nothing comes from asking which currency fits better. It just doesn't matter.

