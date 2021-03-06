---
layout: default
title: Papers
---

## Fisheries + POSEIDON

### A computational approach to managing coupled human-environmental systems: the POSEIDON model of ocean fisheries; 

The main paper about POSEIDON: a generic agent-based model of fisheries. Open access, [here](https://rdcu.be/VcVb).

How to find optimal policies in a complex system? Build an agent-based model and focus on adaptive agents that respond and often bypass the rules you impose. 
Now test your policy levers against the adaptive agents trying to use a smart searching algorithm (we settled on [Bayesian Optimization](https://www.cs.ox.ac.uk/people/nando.defreitas/publications/BayesOptLoop.pdf))
The model will predict where the pair (policy,adaptive agents) will end up going and we can use it to make regulations that are either robust to adaptation or leverage adaptation to better maximize welfare.

Published in 2018 in Sustainability Science ([here](https://link.springer.com/article/10.1007/s11625-018-0579-9)); technical appendix available [here]({{ site.baseurl }}poseidon/appendix.html). Code available on GPL license, [here](https://github.com/CarrKnight/POSEIDON)



### Repeated discrete choices in geographical agent based models with an application to fisheries

A collection of algorithms to simulate fishing by commercial vessels.
Started as a description of what we made in POSEIDON but then spun-off into its own library.

The key design principle here is to try and be adaptive without overfitting to interviews and data.  
The problem is the Lucas critique: if I just transpose fixed heuristics (from data or from interviews) into my model we can't assume they are valid when policy changes.
In econ the answer is to focus on optimal decision making at all times. That can't work in fisheries because the dynamic program is intractable.  
So let's focus on general, adaptive heuristics and see which ones work better and is less brittle.

Accepted with minor revisions in Environmental Modelling & Software. Draft available [here]({{ site.baseurl }}/poseidon/algorithms.html). Code available on open source MIT license, [here](https://github.com/CarrKnight/discrete-choosers).

### Indirect Inference Through Prediction

I wanted to write a paper on indirect inference being so much cooler than the alternatives but it turned out to be heavily dependent on the selection of summary statistics. I wrote a paper on how to choose summary statistics instead.  
I think it straddles the uncomfortable line between being obvious and having been done already; fortunately it's usually where good papers are.

Pre-print [here]({{ site.baseurl }}poseidon/indirectinference.html) and also on [arXiv](https://arxiv.org/abs/1807.01579); R Markdown code to replicate is [here](https://www.dropbox.com/s/zk0fi8dp5i18jav/indirectinference.Rmd?dl=0).  
I also wrote a short tutorial with code [here]({{ site.baseurl }}abm/2018/07/13/indirect-inference-tutorial.html).


## Economics and PID Controllers

### Zero Knowledge Traders
This is my first paper on the zero-knowledge framework. It was [published](http://jasss.soc.surrey.ac.uk/17/3/4.html) on the Journal of Artificial Societies and Social Simulation

Traders find prices by trial and error. Each day they try a price, if they sold too much they raise the price the next day (and viceversa). They do trial and error with PID controllers, which is pretty cool.

Producers also work by trial and error, choosing daily production by hill-climbing. Never really liked this part but I needed to show how to integrate production. God forbids somebody starts thinking I am writing financial models.

You can have a pretty pdf version [here]({{ site.baseurl }}/assets/EEA.pdf) since the JASSS doesn't use mathjax.  If you want slides your best bet is to go through the dissertation slides [here]({{ site.baseurl }}/assets/defense/presentation.html)  since they are interactive and clearer.
Code is [here](https://github.com/CarrKnight/MacroIIDiscrete).

### Sticky Prices Microfoundations in a Supply Chain Agent Based Model
This is my second paper on the zero-knowledge framework. PID pricing is unchanged but I moved to marginal analysis to set production.

In a supply-chain it takes time for downstream firms to adapt to changes from upstream. This creates a lag between an upstream firm changing price and it affecting the economy. Ignoring this lag often breaks the system. The solution is for upstream firms to use sticky-prices, waiting for the full effects of price changes before adjusting prices further. 


Draft Paper [here]({{ site.baseurl }}/assets/stickyDraft.pdf),Slides [here]({{ site.baseurl }}//assets/stickyDraft.pdf), Presentation video [here](https://www.youtube.com/watch?v=DCsgPY27XB0). 
It uses the same code [repository](https://github.com/CarrKnight/MacroIIDiscrete) as the first paper; all the pictures in the draft were generated running [StickyPricesCSVPrinter.java](https://github.com/CarrKnight/MacroIIDiscrete/blob/master/src/main/java/model/experiments/stickyprices/StickyPricesCSVPrinter.java) 

