---
layout: default
title: Papers
---

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

