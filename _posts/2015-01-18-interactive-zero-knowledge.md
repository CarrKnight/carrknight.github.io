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

The problem you solved is the fundamental unit of the zero-knowledge methodology. Agents are price-makers and have no knowledge of the world around them so they proceed by experimentation.

In the previous example you were tinkering with the price slider. When running computer simulations I have [PID controllers](http://en.wikipedia.org/wiki/PID_controller) take your place. They are just an easy way to automate trial-and-error. See for yourself:

<slider-demo-pid-gui></slider-demo-pid-gui>

The PID controller in this example emulates your reasoning. It has a fixed inflow (50 kg of cheese) and it wants its outflow to match it. It does so by manipulating prices. The PID controller, much like you in the first example, doesn't know what is the relationship between price set and customers attracted so it proceeds by trial and error.  
This a simple [control](http://en.wikipedia.org/wiki/Control_theory) problem solved in a [feedback loop](http://en.wikipedia.org/wiki/Feedback).

Now let's look under the hood of the model. There is a fixed daily supply of cheese and a fixed daily demand. The PID controller keeps changing price until inflow and outflow are the same. You can trace its attempts over the familiar demand-supply diagram:

<slider-demo-charts-gui></slider-demo-charts-gui>

You can complicate this: what happens if there are multiple sellers competing? What if sellers need to keep inventory targets? What if the number of customers attracted is not known, only actual sales? You can take a look at the papers, but the basics stay the same.
 
### Production


Imagine operating in multiple markets simultaneously. You buy input, you sell output, you hire workers. You need to discover the correct price for each market.  
Take cheese-making. Each worker produces one kilo of cheese.  If you want to produce 20 kilos of cheese, what is the correct wage $w$ and the correct sale price $p$?  
We know how to discover one price through PID controllers. All we do here is to have multiple controllers, one for each market. Now one problem with this approach is that the discovery process of one controller can affect the ability of the others. To discover the correct wage $w$ you need to hire workers, these workers produce goods and the daily production defines what is the right cheese price $p$.  
In general though as long as the production quota (20 kg here) is fixed, independent PID controllers work just fine.  
This is how it goes:

<simple-fixed-production> </simple-fixed-production>

The labor target is fixed, it's always 20 workers. That's why the vertical line in the labor market never moves. The target outflow of goods instead changes and is equal to workers hired. Either way the 2 PID controllers solve them together

Hopefully you are convinced multiple PID controllers can deal with a fixed quota just fine. All we need to do is to find the optimal production quota.  
This is a profit-maximization problem. It has been drilled into your head that, in a perfect competitive market, the correct thing to do is to choose production so that:   
$$\text{MB}=\text{MC}$$  
Which for this very simple example simplifies to:  
$$p=w$$  
The next example, you are in charge. Price $p$ and wage $w$ are discovered by independent PID controllers, but you need to set the labor/production quota.  
Can you find the correct one?

<simple-exogenous-production> </simple-exogenous-production>

You probably did a combination of 3 things:

* **Trial and Error**: whenever wages were lower than prices you raised production and viceversa.
* **Learning**: you figured out the simple labor supply curve and good demand and chose as target the intersection of the two.
* **Waiting**: whether by trial and error or by learning you realized that it takes some time for the prices to adjust to any movement in labor target.

You are familiar with the first two items. This is again a control problem, except that instead of equalizing inflow and outflow you are equalizing marginal costs and benefits. 
The novelty though is that it takes time for prices and wages to adjust to movements in targets. 
This is because those prices are being found by a separate, parallel trial and error.

So we can use a PID controller to set production quota as well, since it's a control problem. But because wages and prices need to be re-discovered whenever quotas are changed, the PID controller that sets the quotas is going to function at a *lower frequency*. 
We set a target, give time to the other controllers to find the correct prices by which we judge the profitability of the target, and then we decide to move or stay.  
In the next, and final example, labor target is set by a PID that goes at about a 1/30th of the speed of the price setting controllers. 

<final-demo> </final-demo>

The correct target, 50 workers, is eventually reached. Success!

{% include sliderfooter.html %}
