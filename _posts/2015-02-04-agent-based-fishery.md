---
layout: default
title:  "Agent based fishing"
date:   2015-02-04 12:00:00
categories: dart fishery
--- 

*Conservation notice: this is a simple model I cobbled up in about a week both as a [spike](http://www.scaledagileframework.com/spikes/) to test the capabilities of google maps APIs and as a demo for a post-doc job. [The code](https://github.com/CarrKnight/FisheriesTest) is open-source on MIT license. It was programmed in pure dart.*

Carelessly define a fishery as an area in the sea where fishing is done.  
Biomass is the amount of fish available in it. Capacity is the maximum biomass possible. Untapped, a fishery's biomass grows logistically until it reaches capacity.  
Try to hover over the mouse over the square to see the fishery details. The more opaque, the fuller it is:

<div class="sim" id="lonely"> </div>

In the next example there are 25 fishermen. Each has a personal ability which is the percentage of biomass they are able to extract in a day. This is randomly distributed $\sim U(0\%,0.5\%]$.  
Unchecked, fishermen can consume a fishery entirely. See it for yourself:

<div class="sim" id="overfishing"> </div>

With multiple fisheries, fishermen prefer, *ceteris paribus*, a higher biomass. Fishermen only know the biomass of the fishery they last visited. They also share information in a very simple social network. Imagine the agents being in a line, each learning the biomass of the fishery their left neighbor visited the previous day.  
It is a rudimentary way to create some inertia in an agent-based model that still allow agents to quickly discover the best fishery.

<div class="sim" id="richest"> </div>

Let's add distance and costs. A fisherman $i$ expected profit from choosing fishery $j$ is:  
$$100 * \text{Biomass}_j * \text{Ability}_i - \text{Distance}_j * \text{Oil Price}$$   
Where 100<span>$ </span> is the sale price for one unit of biomass fished, $\text{Biomass}_j$ is the fisherman's predicted biomass of fishery $j$ and distance is kilometers between the center of the fishery and the fisherman's home port.  
A fisherman chooses the most profitable fishery she knows.There is a 1% chance of fishing somewhere else at random. If expected profits are negative the fisherman stays home.

Modifying the $\text{Oil Price}$ is  a crude but effective way of influencing fishermen's behavior. With free oil  fishermen go where the biomass is more plentiful. The more we raise the oil price the more fishermen stay close at home. Raise the oil price too much and nobody goes fishing.  See how, when oil is expensive,  Chicagoans keep to south  lake Michigan even though the north  is richer.

<div class="sim" id="gaspolicy"> </div>

As a policy, changing oil prices has limits. It incentivizes agents to aggregate in the closest fisheries, destryong them. It also has a perverse effect if the richest fisheries are the one closest to port.  
An additional policy lever is to levy a fixed daily tariff for each fishery. This is a fixed cost any fisherman has to pay to use the fishery. This allows for far more flexible policies.  
In the final example Marsala is the richest fishery but is also the closest to port.
 
<div class="sim" id="final"> </div>

##Optimal Policy

Let's take here the economist's view that fish only matters when eaten. We want to know what kind of policy would maximize long term fish consumption.  
Say that "long run" means 10,000 simulation days. Then we want to know what policy maximizes the sum of caught fish over that interval.  

Take the last model, the 4 Sicilian fisheries. Imagine that our only slider is oil prices, how should we set it?
I try three possible policies:

* Fix an oil price for all 10000 days
* Fix a critical biomass level below which you set an oil price and above which you set another
* Use a [PI Controller](http://en.wikipedia.org/wiki/PID_controller) to smoothly vary oil prices trying to keep biomass constant

You can then run a genetic algorithm to find out the best parameters for each of these policies. A very short run nets the following:

<table class="pure-table pure-table-striped"  style="margin:0px auto; width:500px">
  <thead>
  <tr>
    <th>Policy</th>
    <th>Average Daily Biomass</th> 
    <th># Parameters</th>
  </tr>
      </thead>
    <tbody>

  <tr>
    <td>No Policy</td>
    <td> 0.40</td> 
    <td>-</td>
  </tr>
    <tr>
    <td> Fixed Price</td>
    <td> 52.95</td> 
    <td>1</td>
  </tr>
      <tr>
    <td> Threshold Pricing</td>
    <td>  47.27</td> 
    <td> 4</td>
  </tr>
<tr>
    <td> PI Controller</td>
    <td>  56.23</td> 
    <td> 3</td>
  </tr>
      </tbody>

</table>

Policy is far more efficient than letting fisheries die. Interestingly threshold pricing, despite being more complicated than setting a single price, performs worse. If we let the genetic algorithm runs for a very long time it eventually defaults back to fixed pricing.  
PI control works the best. Unfortunately it requires continuous and unbiased monitoring of biomass which is hard in real life.  
You can add an additional PI controller to adjust the tariff of the richest fishery. It doubles the parameters to 6 and increases average daily catch to about 57.1, a small improvement.




<script src="http://maps.googleapis.com/maps/api/js?sensor=false"></script>
<script type="application/dart" src="{{ site.baseurl }}/assets/fishery/main.dart"></script>
<script src="{{ site.baseurl }}/assets/fishery/packages/browser/dart.js"></script>
