---
layout: angular
title:  "Zero-Knowledge Traders, Redrawn"
date:   2015-01-20 12:00:00
categories: control pid zeroknowledge
--- 

{% include sliderheader.html %}

This document is a simple, interactive review of the zero-knowledge traders.

###The Basics
You have to sell 50 kilos of fresh mozzarella cheese every day.  
You have no idea what the right price of your cheese is. You want to make money but you don't want to have unsold cheese since it spoils overnight. What should you do? Give it a try!


<slider-demo-gui></slider-demo-gui>

You probably did a combination of two things:

* **Trial and Error**: whenever you attracted too many people you raised the price, whenever you attracted too few you lowered the price
* **Learning**: you figured out the demand for cheese is linear and from it derived the correct price

The problem you solved is the basics of the zero-knowledge methodology. You have agents that are price-makers and have no knowledge of the world around them so they proceed by experimentation.

In the previous example you were tinkering with the price slider, when running computer simulations I have [PID controllers](http://en.wikipedia.org/wiki/PID_controller) take your place. They are just an easy way to automate trial-and-error. See for yourself:

<slider-demo-pid-gui></slider-demo-pid-gui>

The PID controller in this example emulates your reasoning. It has a fixed inflow (50 kg of cheese) and it wants its outflow to match it. It does so by manipulating prices. The PID controller, much like you in the first example, doesn't know what is the relationship between price set and customer attracted so it proceeds by continuously proposing a new price  and seeing if it's the correct one.  
This a simple [control](http://en.wikipedia.org/wiki/Control_theory) problem solved in a [feedback loop](http://en.wikipedia.org/wiki/Feedback).

Now let's look under the hood of the model. There is a fixed daily supply of cheese and a fixed daily demand. The PID controller keeps changing price until inflow and outflow are the same. You can trace its attempts over the familiar demand-supply diagram:

<slider-demo-charts-gui></slider-demo-charts-gui>

You can complicate this: what happens if there are multiple sellers competing? What if sellers need to keep inventory targets? What if the number of customers attracted is not known, only actual sales? You can take a look at the papers, but the basics stay the same.

### Production


If you operate in multiple markets at the same time, you can use multiple controllers to discover each price.  
Take cheese-making. Each worker produces one kilo of cheese.  If you want to produce 20 kilos of cheese, what is the correct wage $w$ and the correct sale price $p$?  
This is only slightly harder than before. You are running two separate PID controllers, one for each market. They depend on one another since the workers you hire end up producing goods you then need to sell.   
This is how it goes:

<simple-fixed-production> </simple-fixed-production>

The labor target is fixed, it's always 20 workers. That's why the vertical line in the labor market never moves. The target outflow of goods instead changes and is equal to workers hired. Either way the 2 PID controllers solve them together

So now that you are convinced PID controllers can deal with production and discover prices there is just one more variable to endogeneize. How to choose the production target (20 kg in the previous example.  
This is a profit-maximization problem. It has been drilled into your head that, in a perfect competitive market, the correct thing to do is to choose production so that:   
$$\text{MB}=\text{MC}$$  
Which for this very simple example simplifies to:  
$$p=w$$  
The next example, you are in charge. Prices and Wages are discovered by independent PID controllers, but can you set the right labor target that maximizes profits?

<simple-exogenous-production> </simple-exogenous-production>

You probably did a combination of 3 things:

* **Trial and Error**: whenever wages were lower than prices you raised production and viceversa.
* **Learning**: you figured out the simple labor supply curve and good demand and chose as target the intersection of the two.
* **Waiting**: whether by trial and error or by learning you realized that it takes some time for the prices to adjust to any movement in labor target.

You are familiar with the first two items. This is again a control problem, except that instead of equalizing inflow and outflow you are equalizing marginal costs and benefits. 
The novelty though is that it takes time for prices and wages to adjust to movements in targets. This is because those prices are being found by a separate, parallel trial and error.

So we set target by PID controller but it will function at a *lower frequency*. This way it can set a target and give time to the other controllers to find the correct prices.  
In the next, and final example, labor target is set by a PID but one that activates on average only once every 30 days. 

<final-demo> </final-demo>

The correct target, 50 workers, is eventually reached. Success!

{% include sliderfooter.html %}
