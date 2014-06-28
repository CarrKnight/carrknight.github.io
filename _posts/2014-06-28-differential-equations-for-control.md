---
layout: default
title:  "Common Control Models in Differential Equation Format"
date:   2014-06-28 12:00:00
categories: control pid differentialEquations
--- 

If you are like me and spent months looking for these, you are welcome. For everyone else, these are just common approximative models used in control theory to fit processes to. Unfortunately they are always expressed as Laplace transforms. S-space isn't very useful to me, I really need processes in time. All credit to [this stackexchange answer](http://mathematica.stackexchange.com/a/44322/16217). An explanation of its math is [here](http://lpsa.swarthmore.edu/Representations/SysRepTransformations/TF2SDE.html#Transfer_). Thank you, kind strangers.

##### First Order Plus Dead Time (**FOPDT**), 
* Transfer function:  
$ \frac{\mu_M e^{-s D_M}}{1+sT_M}$
* Delay differential equation:  
$ y(t) + T_M \frac{dy}{dt} = \mu_M u(t-D_M)$

##### Integrator Plus Dead Time (**IPDT**)
* Transfer function:  
$ \frac{\mu_M e^{-s D_M}}{s}$
* Delay differential equation:  
$ \frac{dy}{dt} = \mu_M u(t-D_M)$

##### First Order Integrator Plus Dead Time (**FOIPDT**)
* Transfer function:  
$ \frac{\mu_M e^{-s D_M}}{s(1+sT_M)}$
* Delay differential equation:  
$ \frac{dy}{dt} + T_M \frac{d^2y}{d^2t} = \mu_M u(t-D_M)$

##### Second Order Plus Dead Time, overdampened (**SOPDT**)
* Transfer function:  
$ \frac{\mu_M e^{-s D_M}}{(1+sT_1)(1+sT_2)}$
* Delay differential equation:  
$ y(t) + (T_1 + T_2) \frac{dy}{dt} + T_1T_2 \frac{d^2y}{d^2t} = \mu_M u(t-D_M)$

These will come in handy for model fitting, I hope.
