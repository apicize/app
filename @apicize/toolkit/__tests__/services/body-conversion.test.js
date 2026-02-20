"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var body_conversion_1 = require("../../src/services/body-conversion");
var lib_typescript_1 = require("@apicize/lib-typescript");
describe('BodyConversion', function () {
    describe('conversions', function () {
        var testBase64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAFAAUADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD4yooooAKKKKACiiigAooooAKKKKACiiigAoop0aPI4RFZmJwAoyTQA2ivRvBnwR+JvisJJp3ha7gtn5Fxe/6PHj1G/BI+gNeweF/2PtUlCSeJvFtra55aKxgMp+m5to/Q15uKzjA4XSrVSfbd/crsuNOUtkfLNFfeOg/ssfDDTgrXsWq6s46/aLrYv5Rhf5122lfBv4X6WALTwPoxx3mg84/m+a8CvxtgKekIyl8kvzf6Gqw0mfmxTxFKekbn/gJr9RrTwp4ZslC2fhzR7YDoIrKNP5Crq6dYoMJZWyj2iUf0ry6niDTj8NBv/t7/AIDLWEfc/KwxyDqjD6imV+qcum2Egw9jbN9YlP8ASsy+8IeFb1SL3wzo1yD1EthE/wDNawXiPTXxYd/+Bf8AAQ/qb7n5f0V+jOr/AAX+FupqRc+CdJTPU28ZgP8A5DK1wviD9ln4cXwZtOl1jSX/AIRDciRB9RICT+Yrso+I2VzdqsZR+Sa/B3/Al4SfQ+IKK+lPE/7Jev24aTw54osL8DkR3kLW7fTK7wT+VeReMPhN8Q/CgeTWPC18LdOTcW6ieID1LR5C/jivpMDxLlWPaVCvFvs3Z/c7MylRnHdHEUUUV7hkFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRVrStOv8AVtQh0/TLOe8u52CxQwRl3c+gAoAq1s+EvC3iLxZqa6b4c0e71O5PVYIyQo9WPRR7kivpb4Nfsm3N0sOrfEi5a2iOGXSrZ/3h9pJB936Lz7ivq3wr4Y0HwrpUel+HtJtdNtEHEcEYXPuT1Y+55r57MOIaGHvGl70vw+/r8vvNYUm9z5P+Gv7Il7OIrzx7rQtFOCbGwIZ/o0h4H4A/Wvo3wL8K/AfgmNB4f8N2UE6/8vMiebOffe2SPwxXclaNtfE4/N8Zi9Jzsuy0X/B+Z0xpxjsQlKQrU22jbXgTRqQFeKQrU+2m7a4qiKRAV4ppWrBWm7a4aiKRXKcUwrxVkrTCtcNQtFYpxTGXirLLxTGWuCoUiqy8dKjZBirTLxTGWuKbKPPPHfwj8AeMhJJrPh22F2+T9rth5M+fUsuN3/Asivnn4ifsra3YCS78FaqmrQjJFndkRTgegf7jH67K+xStNKivfyni3NMraVGq3FfZlqv+B8mjKpQhPdH5ea/our6BqUmm63pt1p15H96G4iKNj1Geo9xwaz6/TXxl4R8O+LtMOneI9ItdRt+dolX5oye6MPmQ+4INfLHxc/Zh1bSRNqngOeTVrQZZtPmIFzGP9huBIPbhv941+tZF4h4HHtUsUvZT8/hfz6fP7zhq4SUdY6o+caKluree1uZLa6hkgniYpJHIpVkYdQQeQfaoq/QU01dHIFFFFMAooooAKKKKACiiigAooooAKKKKACiiigAoor6A/Zq/Z51Dx9JB4k8UJNp/hlW3RpgrLfY7L/dT/a79vWsa9enQg51HZDSbdkcJ8Fvg/wCK/ihqgj0q3+y6XE+LrUplPlR+oH99vYfjivvH4P8Awh8IfDPTVi0WyE+oOm241GdQZ5fUZ/hX/ZH6123h/RtL0HSLfSNGsYLGxtkCQwQptVR/nvV/bXxeY5rVxd4x0h27+p0Qgoke2l21JigrXgTgakW2jbUuKTFclSJSIttG2pSKQiuGoikRbaQrUpFIV5rgqItEJWk21NimkVwVCkQFTTStTkU0rxXBULRXZeKYy1ZZeKYy1wVCkVmWonXirTLUbLXn1GWiqVphWrLLTGWseYZXIpjLmrDLTCKtSA8x+MPwd8K/Ea1eW9gFhrCriHUrdB5gx0DjpIvseR2Ir4n+KXw48T/DvWPsOvWmYJCfs17Fkw3AH909j6qcEfTBr9I2FZHinw9o/ibRbjRtd0+G+sbgYkikHHsQeoI7EcjtX3HDPG2LydqlV9+j26r/AAv9NvTc5a2GjU1WjPzCor2D4/fBHVfh3cvq2medqPhqR8LcEZktSTwkuPyD9D7HAPj9fveXZjhsxoRxGGlzRf8AVn2fkeXODg7MKKKK7iQooooAKKKKACiiigAooooAKKK+gf2TPge/j7Vl8UeJLdl8M2UnyRsMfbpQfu/7g/iPfp61jXrwoQdSb0Q0m3ZGx+yj+z6/iqS38aeNLVk0NGD2Vk4wb0j+Jv8Apn/6F9Ov3BbQRW8CQQRpFFGoVEQYVQOgA7Ci1git4I4II0iijUKiIMBQOAAOwqdRXxWMxlTGVOaW3RdjojFRQgFLtp4ApcVyOnoUR4oxT8UY5rkqRKQzFJjipMUlcNRFIjxxSEU8009K4KiLQ00hpx6U09K8+oikNNNPWnGmmvPqItDTTacetJXn1UWhhppp5pprz6qKQxgKYy81IaaetedVLRCy0wrU5ppWuS5Viuy1Gy1ZK1Gy1akIrMtMIqwy1Gy1opAUdQs7a9tJrS8giuLeZDHLFIoZHUjBBB4IIr4n/aT+CE/ga5k8SeG4pJ/DUz/vI+WaxYnhWPUxk8Bu3Q84J+4iKq6hZ217ZzWd3BHcW86GOWKRQyupGCpB6givpeHOI8TkeJ9pT1g/ij0a/Rro/wBDGtRVRWZ+WlFewftJ/CGf4d65/aekxyS+Gr6Q/Z2OSbWQ8+Sx/MqT1Ax1BJ8fr+kMuzGhmOGjicPK8Zf1Z+a6njzg4OzCiiiu4kKKKKACiiigAooq1pGn3mrapa6Zp8D3F3dSrDDEgyXdjgCgDu/gB8Mb/wCKHjmHSoxJDpdvibUboD/VxZ+6D/eboPxPav0n8PaPp2g6LaaNpFpHaWNnEIoIUGAqiuJ+AXw3sfhn4AtdFiVJNQmAm1G4Uf62Yjnn+6vQfT3r0Va+FzTMfrdXli/cW3n5nTCHKiRRUijimLUi1x05IocAMUY4oGKXrWspKwCYpDTjTa4ajKQh6009adXkXxh/aC8AfDa7k0u8uZ9W1lPv2FgAzRHt5jEhU+nLe1c0KFTET5KUbsd0ldnrJppr5b0X9s/wvcX6xav4O1WwtWbHnQXKTso9SpC/oT+NfRPgrxZ4d8aaBFrnhjVYNSsZON8ZIKN3V1PKsPQgGufHZdisIr1oNLv0+9DjOMtjaPSmnpTj0pp6V4VQ1Q0000400159QtDT1pDSnrSGvPqlIaaaacaaa86qWhppp61j+NfFXh/wboUut+JdUg06xj43yHl27KqjlmPoATXz1rX7YnhiC/aLSfCOqX1sGx501wkBYeoUBv1IrfA8P5lmicsJRckuuiX3uyFKrCHxM+mzRXlPwl+PXgT4i3aaZZ3E+law/wByxvgFaU9/LYEq/wBOG9q9Wrxsfl+JwFZ0cVBwl2f9arzRpCcZK8WIRmmMtSUhGa40yiBhUbLVhlqNhWiYiswqNhVh1qJhWqYGJ4s0DS/E3h+80LWbVbmxvIzHKh/Qg9iDgg9iAa/PP4v+AtS+HfjS50G+3Swf62yuduBcQk/K31HQjsQe2DX6RsK8z/aD+G1v8RvA8tnEiLrFlun02Y8YkxzGT/dcDB9DtPavuuCeJnk+L9lVf7me/k+kv8/L0Ry4mj7SN1uj896KluoJ7W6ltbmJ4Z4XMckbjDIwOCCOxBqKv6ITTV0eSFFFFMAooooAK+r/ANhH4Zi5vJ/iRq1vmOAtb6Urjq/SSUfQfKPct6V80+CPDt94t8W6Z4c01C1zf3CwqccKCeWPsBkn6V+ofgzQLDwt4X07w9pcYjtLCBYYxjrgcsfcnJPua+e4hzD6vQ9lF+9L8uv37fea0oXdzbSpVqNakWviITOkkWnimLTxW8agrDxS02iqdQLCk0hozTa55zGkeH/tefF2X4a+CY9O0SdU8SayGjtWHJtohw82PXkBc9znnaRX54XE0txPJcXEryzSsXkkdizOxOSSTyST3r039qfxhJ4z+N+v3olL2dhMdOsxnIEcJKkj2Z97/wDAq8ur9ByfBRwuGWnvS1f+XyOSpLmYV6H8Bfijq3wt8bQataySzaXOyx6nZBvlniz1A6b1ySp9eOhNeeUV6NehCvTdOorpkptO6P1y0nULLVtKtNU064S5s7yFJ7eVDw6MAVYfUEVZNfO37Bfi+TXfhVdeHLqUyXHh+68uPJyRby5dPyYSj6AV9EHrX4hmmFeDxM6D+y/w6fgelCXNFMQ009aU0hrxKjNENNNpx6U09K8+qy0NPSqmsahZ6TpV1qmo3CW9naQvPPK/REUEsT9ADVs188/t2+LpNE+F1p4dtZSlxr11skwcEwRYd/zYxD6E08sy+WZY2lhY/advRbt/JXCc+SLkfKnx1+Juq/E/xpPqt1JLFpkDNHptmT8sEWepHTe2AWPrx0Arz+iiv6WwmFpYSjGhRjaMVZI8aUnJ3Y+CWWCeOeCV4pY2Do6MVZWByCCOhB719/fsn/FeT4i+DJNP1mYP4h0gLHdMeDcxH7k2PXghvcZ43AV+f1emfsxeLZPCHxo0K7MpS0vphp92M4BjmIUE+yvsb/gNfL8bZDTzfLJ2X7yCcovrpuvmtPWz6G+GqunNdmfo9RRRX8xHtCEZpjCpKQjNNMRXYVE4qwwqNxWsWIrMKicZFWHFRMK2iwPjj9tL4dDSddh8eaXBts9SfytQVBxHcY4f6OBz/tKe7V841+mvj7wzYeL/AAjqfhzUl/0e+gMe7GTG3VXHurAMPpX5teI9IvdA16+0TUo/LvLGd4Jl7blOMj1B6g9xX7/4eZ68fgXhar9+lp6x6fdt9x5WLpcsuZbMz6KKK/QjkCiinRo0kixopZmICgdzQB9VfsC+CBPqOq+PbyHK2w+xWJYfxkAyMPoMD/gRr7GSuG+CHhNPBPwv0Lw+ECzw2yvc4HWZ/mf9SR+FdylflGbY/wCt4yc09FovRf57ndTjyxsSrUq1EtSLXFGoVYlWnio1p9aqoKw7NFNzRT9oFhc1Q8Q340vQNR1MgEWdrLPg/wCwhb+lXq534lo8vw48TRR53vpF2q49TC2KmM1KaT7jPyimlkmmeaVy8kjFnYnkk8k0yiiv2A88KKKKAPpj/gnrqbwfFDXdJ3Yiu9HM2M9XjlQD9JGr7iNfA/7A0bv8cZ2XOE0W4Zvp5kQ/mRX3ua/IuNEo5k7dUjvw/wAAhpppTTTXxFSR0oQ0hpTTTXBUkUhD1r4h/wCCgWpPP8TtD0oNmK00gS4z0eSVwf0jWvt018G/t4xunxugZs4fRrdl+m+UfzBr6rw/jGWdRb6Rl/l+pjiv4Z4DRRRX7yeWFPhkkhmSaJykiMGVh1BHINMooauB+rug3w1PQ7DUgABd20c4A/21Df1q7WD8OUeL4e+G4pM700m1Vs+oiXNb1fxxiYKFacY7Jv8AM+hWqCiiisRjXFRMKnNROKqLEyu4qFhVlxULit4sRA44r48/bh8GDT/EuneNbSLEOpr9lvCBwJ0HyMfdkGP+2dfYrCuA+PfhMeMvhXrejxxb7sQG4s8Dnzo/mUD/AHsFfoxr6jhLNnleaUqzdot8svR/5aP5GGIp88Gj86aKKK/pw8YK9G/Zr8MjxX8aPD+nSR77aGf7ZcAjjZEN+D9SAPxrzmvqb/gn9oIl1vxJ4lkTP2eCOziJHdyWbH4Iv515mcYr6rgatVbpaer0X5l0480kj7GQ1KtQoamWvxxTPQJVqVaiWpFrRVBWJFp1MBpc1oqoWHUU2in7QLDs1DdwR3VrNazLuimRo3HqpGCKkzSZqHVCx+SPiPS7jQ/EOpaLdgi4sLuW1lBGPmjcqf1FUK+gv25fAkvhv4qnxPbQkaZ4hTztwHypcoAsq/U/K/vub0r59r9kwGLji8NCtHqvx6/iefKPK7BRRRXYSfVn/BO7RHk8R+KfEjJhLezisUYjqZH3sB9PKXP1FfZhryn9lTwLL4C+DunWd7CYtT1FjqF6rDDI8gG1D6FUCAj13V6qa/C+JcfHF5jVqRel7L5afjuenRjywSENNNKaSvmKkjZCGmmlNNNcFSRaENfG/wDwUK0V4/EfhfxEqZS4s5bJ2A6GN96g/XzWx9DX2Qa8p/an8DS+O/hDqNpZQmXU9OYX9kqjLO6A7kHqWQuAPXFerwrmccvzijWm7Rbs/SStf5PUzrw56bSPzmooor+lTxwq/wCHdMn1vxBp2jWoJnv7qK2iAGfmdgo/U1Qr3z9iXwPL4i+KA8S3MJOm+H087cRw9wwKxr+HzP7bV9a8vOsyhlmAq4ub+FNr16L5uyLpw55KJ902sEdtbRW0K7YokCIPQAYAqWiiv5Hbbd2e8FFFFIYU1xTqQ9KaAgYVC4qwwqFxWsWSQNUMgqdhzUTjitosTPzi+OvhseFPiz4h0eOPy7dbsz24A4EUoEigfQNj8K4mvpH9u7QhbeLNA8RRpgXto9rIQP4om3An3Ikx/wABr5ur+peGse8flVCu3duKT9Vo/wAUeLWjyzaCvvH9iDSBp3wVjvWXD6lfzT5x1VcRj/0A/nXwdX6T/s9aeNL+CvhK0C4zpscp+sn7w/q1eVxtX9ngIwX2pL8E3/kXhleR6GhqZKgSpVr8tVQ7bE61IpqJakU1SqBYkzS5puaM1aqCsOzRmm5ozT9oFhc0ZpM0mal1B2OT+LngLRviR4IvPDGsgosv7y2uFXL20wztkX6ZII7gkd6/OL4qfDbxX8N9efS/EmnvHGWItryNSbe5X1R+nTqp5HcCv1JzVXU7Gx1OykstSsra9tZBh4biJZEb6qwINe3kvEtXK24W5oPp280ZVKKn6n5IAEkADJNfUf7KX7PepahrFn438dadJZ6ZasJrDT7hMSXUg5V3U8rGDyAfvcfw9fq7Rvh/4E0W+F/pHgzw7YXanKz22mwxup9mC5H4V0prvzfjeeIoujhocl923r8u3qTTwyTvIDTTQaQmvzuczrSA0hoNNJrjqTKQGmmlNNNcNSZSQGmmlNNNcNSRSPjP9qf9n/UbDV7vxr4G0+S7025YzX2n26ZktnPLOijkxk8kD7vP8PT5hIIOCMEV+tNc3rPgHwNrN8b7V/B3h+/umOWmuNOikdj7sVyfxr9KyDxNq4LDrD42m6nLopJ2duzvv6/ffc46uCUneLsfnR8L/h14p+Iuuppnh3T3kQMBcXjqRBbL6u/Tp/COT2Br9EPhR4F0j4deC7Tw1pALrF+8uLhlw9xMcbpG+uAAOwAHaui02wsdNs0s9Os7eztoxhIbeJY0X6KoAFWa+d4r40xOftUlHkpLVRve77t/kunmbUMOqWu7CiiivizpCiiigAooooAjeoXFTvUL1pFksrvUbVM9QtW8QPA/23NJF98JIdRVfn03UopC2OiOGjI/Nk/Kviav0P8A2j9PGpfBLxXbld2yxNx/36ZZP/ZK/PCv33wzxPtMplTf2Zv7mk/zueVjFadwr9SfA1utl4M0OzUYEGnW8QH+7Go/pX5cwDMyD1Yfzr9U9IATTLRB0WFB/wCOijxBqctOhHu5fp/mGEWrNFDUyVXQ1MlfmaqHZYnWpVqFKkWn7QLEmaM03NGapVQsOzRmm5ozT9qFh2aTNJmipdQLC5pM0maTNZSqDsKTSGkzRXPKoOwE0hNBNNJrmnUKsKTTTQaQ1yTqFJAaaTQTSGuKpMpIQ0lBorjlK5SCiiisxhRRRQAUUUUAFFFFABRRRQA16hbpUz1C9XETIHqJqmkqFq3iI5z4j2wvfAPiKzIyJ9LuYyP96Jh/WvzMr9RdfQSaPexno1vIp/FTX5dV+1eFU26OJj2cfxUv8jzcduh0RxKh9GFfqjo8gk0u0cdGgQ/+Oivysr9QPAF2L3wPoN6pyLjTbaUH/eiU/wBa7vEdWp4eXnL9P8icHuzo0NTJVZTUyGvyv2h3WLCdalU1AhqVSKPaBYkozTaWmqoWFzRmkop+1CwtGabRmpdULC5opM0hNZyqhYXNITSZpKwlUKsKTSE0hNITXNOoOwpppNBNIa5Z1CkgJpCaCaSuSUrjSCiiisigooooAKKKKACiiigAooooAKKKKAGvUL1M9Qt0q4iZDJULVK9RNW8RGdr7iPR72Q9Ft5GP4Ka/Lqv0y+I9yLLwB4ivCcCDS7mQn/diY/0r8za/avCqFqOJl3cfwUv8zzcdugr9Gf2dNSGp/BLwncht23T1gJ94iY//AGSvzmr7f/Yi1gX3wgk05n+fTdRliC+iOFkB/Nm/Kva8RqLnlcaq+zJfc01+djPCP37HvyGpkNVkIqZDX4h7Q9KxZQiplNVkNTKeaXtAsS5pc0zNLmmqoWHZ968l/ai+KV78LvAtrfaOlpLrF/diC2S5UsqoAWkfaCM4+UderivVLieG3gknnlSKGNS8kjsFVVAySSegA718d3VxJ+0d+0rax2qPJ4K8N4LMQdkkStlic95nAUDg7Fz1U19Hw3g6eJxEsRiV+5pLml28l6t9OpjWk0rLdn1n4Mv9Q1Twho2p6tapa6hd2EE91AmdsUrxhmUZ5wCSK1s03PpRmvnaldSk5JWT6GyQ7NJSZpM1i6o7C5opM0maxlUHYXNITSZpCa551B2A0hNFFc8pXKsFFFFZjCiiigAooooAKKKKACsnxlfahpfhHWNT0q2S61C0sZp7WB87ZJEQsqnHOCQBWtRV05KE1Jq6T27+QmeT/swfFC8+J/ga6vtYS0i1ewuzBcpbKVVkIDRvtJOMgsOvVDXrFfHVrPJ+zn+0ldR3SPH4L8R5KuAdkcTNlTx3hclSOTsbPVhX2FBNFcQRzwSpLFIodHRgyspGQQR1BHevpuK8spYbFRxOEX7islKFtl3j6xfTpoY0JuUeWW6H0UUV8sbjHqF6leoXNaRRLInqFqkeo2reIHnP7R+oDTfgl4ruC23fYm3/AO/rLH/7PX54V9s/tuasLH4SQ6crfPqWpRRlc9UQNIT+ap+dfE1fvvhnhvZ5TKo/tTf3JJfnc8rGO87BX0p+wfrwt/FXiDw5I+Be2iXUQJ/iibaQPciTP/Aa+a67f4E+JB4U+LXh7WJJPLtxdCC4JPAilBjYn6Bt34V9TxLgXj8qr0EtXG69VqvxRjRlyzTP0fQ1MhFVYzxU6Gv5gcz2S0jVKrVVVqq+Io9VuPDupW+h3UVpqslrKllPKu5IpipCMwwcgNg9D9DRGXNJRbtcZsg8Vg+NPGfhfwZpp1DxPrdnpkGCVE0nzyY7Ig+Zz7KDXzafhh+1DqmYLz4lw2kTfedNVlQ49vLjz/KtTwp+ybYSaiNU+IHi6/1+4Y7pIYMxhz6NKxZ2H02n3r6uOT5RhvfxeOjJdqacm/m7JfM5/aVH8MfvPMP2gv2hr34hsfC3htpdF8MSSBLmeXPnXS56uFztj77BknHP90fWfwS8AeH/AId+BrXSdBkW789VuLm/4zeOwHz8dFx90DgD1JJPzn+2f8ItH8O+HdG8VeENHg0+wslFhfQW6YAUkmOVu5O4spY5JLJXXfsR/FFdc8OH4faxc/8AEy0qPdp7O3M1t/cHqY+mP7pH9019JnVGji+GqeIylONGEnzx6325pPq1v2s09kZU241mqm/Q+l80maSkr8qdU7bDs0maTNJmodUdh2aTNJRWbncdgzRRRWbYBRRRSGFFFFABRRRQAUUUUAFFFFABRRRQBw/xr8AeH/iH4HutK16RbTyFa4tr/A3WbgH5+eq4+8DwR6EAj5O/Z+/aEvfh6w8L+I2l1rwzHIUt54s+darnqgbG6PvsOCM8eh9V/bb+KK6H4cHw/wBHuf8AiZarHu1BkPMNt/cPoZOn+6D/AHhXI/sZfCLR/EXhzWfFXi/R4NQsL1TYWMNwmQVBBklXuDuCqGGCCr1+tZFhqOD4Yq184TlRnJckOqe3NF9G9+1k3szgqycqyVPfqfUfgvxl4X8Zact/4Y1yz1OEgFhFJ88fs6H5kPswFbx6V8zeK/2TrCPUDqnw/wDF1/oNwpLRwz5kCH0WVSrqPruPvWWvww/ag0zEFn8SobqJfuu+qyuce/mR5/nXzDyHJ8U+fB4+MV2qJxa+aun8jb2tSPxR+4+qGNQuaqeHYtUt/Dumwa5dRXeqx2sSXs8S7UlmCgOyjAwC2T0H0FWXNfKOHLJxve3U3I2PNROeKkaoZDWkUJnx/wDt3a6LnxboHh2N8iytHupAD/FK20A+4Eef+Be9fN1dt8dPEg8V/FnxDrEcnmW7XZhtyDwYowI0I+oXP41xNf1Lw1gHgMqoUGrNRTfq9X+LPFrS55thRRRXuGR+i3wE8WDxl8K9E1h5d92IBb3mTz50fysT/vYDfRhXfqa+Ov2HvGY0/wAS6j4Ku5cQ6kv2qzBPAnQfOo92QZ/7Z19hoeK/mPi3KXleaVaKVot80fR6/hqvkezQqc8EydDUyGqympkNfLyNyyrVIDUCmpUNYu40Z/inRNO8S+HNQ0DVofOsb+BoJk77WHUHsR1B7EA1+b3iXSvE3wd+K8ltFcPbapo10JbS5UYWaPqjgd1ZTgj3ZT3r9M68U/au+Eg+InhIato8APiTSUZrYAc3UXVoT79198jjcTX3fAfEcMsxTwuK/g1dHfZPZN+T2flr0OXFUeePNHdHZfBT4j6T8TfBcGuWBSG8jxHqFnuy1tNjke6nqp7j3BA7mvzJ+EvxA1/4Y+Mo9a0vcQD5V9ZSEqlxHnlGHYjseoP4g/oh8NfHGgfEDwtB4g8PXQlgk+WWJsCS3kxzG47MPyIwRkEGs+NOEqmSV/bUVehJ6P8Alf8AK/0fVedx4auqis9zpqKKK+FOoKKKKACiiigAooooAKKKKACiiigAooooAKKKKACuG+NfxH0n4ZeC59cvyk15JmLT7PdhribHA9lHVj2HuQDp/ErxxoHw/wDC1x4g8Q3Qigj+WKJcGS4kxxGg7sfyAyTgAmvzv+LXxA1/4neMpNa1TcAT5VjZRkslvHnhFHcnuepP4Afc8F8I1M7r+2rK1CL1f8z/AJV+r6LzOXE4hU1Zbj/DOleJvjF8V47aWd7nVNYujLd3LDKwx9XcjsqqMAeyqO1fpD4X0TTvDXh2w0DSYfJsbCBYIU77VGMk9yepPckmvJ/2UvhJ/wAK68JHVdYgUeJNWRWuQRzaxdVhB9e7e+BztBr2qtOPOI4Znio4XC/wKWits3s2vJbLy16hhaLhHmluwNROae5qJjXwkUdLGOahc09zULGt4oQ1jXAfHvxYPBvwr1vWI5fLu2gNtaYPPnSfKpH+7kt9FNd654r48/bh8ZjUPEuneCrSXMOmL9qvADwZ3HyKfdUOf+2lfUcJZS80zSlRavFPml6L/PRfMwxFTkg2fN9FFFf04eMFFFFAGh4c1e90DXrHW9Nl8u8sZ0nhbtuU5wfUHoR3FfpL4B8TWHi/wjpviPTWzb30Ak25yY26Mh91YFT9K/Mqvo79i34ijSddm8B6pPts9Scy6ezniO4x8yfRwOP9pR3avz3xDyJ4/ArFUl79LX1j1+7f7zrwlXllyvZn2OpqVDVdDkVKpr8Akj1SyhqVTVZDUqmsZICwDmlqNTTwc1k0M+U/2vPgW92118Q/B1mWnwZNXsYl5k9Z0A7/AN4d/vdc5+cfhT8RPEfw38SprPh+5wGwt1aSEmG5T+64/kRyO3fP6d18pftNfs5G7kuvGPw8sh57ZlvtIiXHmHqZIR69ynf+Hng/rvBvGVCtQ/sjN7ODVoyltb+WX6Pp9zODEYdp+0p7nt3wb+LHhb4naOLnSJxb6lEgN3pszDzoT3I/vpnow/HB4rv6/KTR9T1bw9rMOo6XeXWm6jaSZjliYpJGw4I/mCD7g19a/Bf9quyvEg0f4kxCzueEXVreP91J7yoOUP8AtLkeyiuPifw4xGDbxGWpzp/y/aXp/Mvx9dyqOMUtJ6M+pqKraXqFjqlhDqGmXlve2k67op4JA6OPUMODVmvy6UXFtNWaO0KKKKQwooooAKKKKACiiigAooqtqmoWOl2E2oane29laQLulnnkEcaD1LHgU4xcmkldsRZrgPjJ8WPC3ww0c3Grzi41KVCbTTYWHnTnsT/cTPVj74yeK8Y+NP7VdjZpNo/w2iF5c8o2rXEf7mP3iQ8uf9psDjowr5K1jU9W8Q6zLqOqXl1qWo3cmXllYvJIx4A/oAPoK/UeGPDjEYxrEZknCn/L9p+v8q/HyW5xVsYo6Q1Z0HxW+IniT4keJX1nxBc5Vcra2kZIhtkP8KD8sk8nv2x9Hfsh/At7RrX4h+MbPbPgSaRYyrzH6TuD3/ujt97rjB+zL+zkbSS18Y/EOyHnriWx0iVc+WeoknHr3Cdv4ueB9W12cZcY0KND+yMosoJWlKO1v5Y/q+v3snD4dt+0qbhSE4oJxTGNfkSR3jWNRuaVjUTmtYoQ1zUTGnMaic4FbRQGD4/8TWHhDwjqfiPUW/0exgMm3ODI3RUHuzEKPrX5t+I9Xvdf16+1vUpfMvL6d55m7bmOcD0A6AdhXvv7aXxFGra7D4D0ufdZ6a4l1BkPElxjhPogPP8AtMe6185V+/8Ah5kTwGB+tVV79XX0j0+/f7jysXV5pcq2QUUUV+hHIFFFFABUtrPNa3MV1bSvDPC4kjkQ4ZGByCD2INRUUmk1ZgfoR+z38SYPiN4HivJXRdYstsGpQjjEmOJAP7rgZHodw7V6Ypr83PhD491L4d+M7bXrHdLB/qr223YFxCT8y+xHUHsQO2RX6GeE9f0vxN4fs9d0a6W5sbyMSROP1BHYg5BHYgiv53424ZeT4v2tJfuZ7eT6x/y8vRnrYat7SNnujbU1KjVXBqRTXwskdRZU1IrVXVqkU1k0BODmlqNWp4OazaGeLfHn9n3w78RRNrGlNFoviUgk3Kp+5uj2Eyjv/tjn13YAr4k+IPgXxT4C1ltL8T6VNZS5PlS43RTgfxRuOGH6juAa/UWs3xLoOi+JdJl0nX9MtdSsZfvw3EYZc9iPQjsRyO1ff8M8f43KEqFf95SXT7UfR9vJ/Jo5a2FjU1WjPzR+H/xD8Y+A703PhfXbmxVmzJBnfBL/AL0bZU/XGR2Ir6V+Hv7XtlKsdr478PSW0nQ3umHehPqYmOVH0ZvpUfxS/ZHhlaW/+HerCAnLf2bqDkr9ElGSPYMD7tXzT438B+MPBV0bfxP4evtN+basske6Fz/syLlG/Amv03l4X4vjfR1H/wBu1F/nb/t5HH+/w/p+B+ing34ofD/xeqDw/wCK9Mupn6W7S+VP/wB+3w36V2NfkrXU+HPiN488OqqaL4v1uziXpCl45i/74JK/pXzWO8JldvB4j5SX6r/5E2jj/wCZH6g0V+fOlftM/F+yULL4gtr5R0FzYQ5/NVUmt2D9rf4nRrh9P8MTH1ezlH8pRXztXwvzqD91wl6Sf6pGqxtPzPumivhaf9rf4nSLhNP8MQn1SzlP85TWFqv7TPxfvVKxeILaxU9RbWEOfzZWIopeF+dTfvOEfWT/AETB42mj9Bq47xl8UPh/4QVx4g8V6ZazJ1t1l82f/v2mW/Svzv8AEfxF8eeIlZNa8X63eRN1he8cRf8AfAIX9K5avosD4TK6eMxHyiv1f/yJlLH/AMqPr/4hfte2USyWvgTw9JcydBe6mdiD3ESnLD6sv0r5q+IHxD8Y+PL37T4o125vlVt0dvnZBF/uxrhR6Zxk9yai8EeA/GHjW6Fv4Y8PX2pfNtaWOPbCh/2pGwi/iRX0t8Lf2SIYmi1D4iasJyMN/ZunsQv0eU4J9woHs1fS8vC/CEb6Kov+3qj/AMr/APbqMf32I9PwPmn4feBfFPj3WV0vwxpM17KCPNlxtigB/ikc8KP1PYE19t/Ab9n3w78OhDrGqmLWvEoGRcsn7m1PpCp7/wC2efTbkivWPDWg6L4a0mLSdA0y102xi+5DbxhVz6n1J7k8nvWlX5lxNx/jc3ToUP3dJ9F8UvV9vJfNs7KOFjT1erCkJxQTimM1fAJHUDNUbGhjUbNWiQhHaomNKxqNjWqQCMa8z/aE+JNv8OfA8t5E6NrN6Gg02E85fHMhH91Acn1O0d67XxZr+l+GfD95rus3S21jZxmSVz+gA7sTgAdyQK/PL4vePdS+InjS516+3RQf6qztt2Rbwg/Kv1PUnuSe2BX3XBPDLzjF+1qr9zDfzfSP+fl6o5cTW9nGy3Zyl1PNdXMt1cyvNPM5kkkc5Z2JyST3JNRUUV/RCSSsjyQooopgFFFFABRRRQAV7B+zb8Xp/h3rn9marJJL4avpB9oQZJtn6eco/LcB1A9QAfH6K4cxy6hmOGlhsRG8Zf1dea6FQm4O6P1L0+8tr2zhvLOeO4tp0EkUsbBldSMhgR1BFWga+Hf2bPjdP4GuY/DfiSWSfw1M/wC7k5ZrFieWUdTGTyV7dRzkH7Y0+8tr2zhvLO4iuLaZBJFLGwZHUjIII4IIr+b+I+HMTkeJ9nU1g/hl0a/Rrqv0PYo1lUV0XlapFaq4NPVq+aaNiyrU8NVdWqRWrNxAsBqdUAanBqzcR3Jaiure3u7d7a6ginhkG145EDKw9CDwaeGpcikrp3QHlHjH9nj4U+JWeV/Di6TcN/y20uQ2+P8AgAzH/wCO15P4i/Y5tmZn8O+NpYx/DFf2Yf8AN0Yf+g19YUV9JgeMM7wKSpYiVuz95f8Ak1/wMpYenLdHwtqn7JXxMtWJtL3w9fr28u6dG/EOgH61hT/sy/GKM4Tw7aze6alAP5uK/QaivoaXihnUFaShL1i/0kjF4Km+5+fMH7MvxikbD+HbWH3fUoD/ACc1u6X+yV8TLpgbu98PWC9/MundvwCIR+tfdNFFXxQzqatFQj6Rf6yYLBU/M+T/AA7+xxbqyv4i8bSyL/FDYWYQ/g7sf/Qa9Y8Hfs7/AAp8NMkq+HRq1yn/AC21SQ3GfqnEf/jtesUV8/juMc7xyaq4iVuy91f+S2/E1jh6cdkRWtvBaW6W1rBFBDGNqRxoFVR6ADgVLSZFIWr5p3buzYdTS1MLU0tTUQuKWpjNSM1Rs1aKIhWao2akZqYTWiiAE1V1C8trKzmvLyeO3toEMkssjBVRQMliT0AFGoXltZWc15eXEVvbQoZJZZGCoigZJJPAAr4n/aT+N0/jm5k8N+G5ZIPDUL/vJOVa+YHhmHURg8he/U84A+l4c4cxOeYn2dPSC+KXRL9W+i/QxrVlTV2Zn7SXxen+Imu/2ZpUkkXhqxkP2dDkG5ccecw/PaD0B9SQPH6KK/pDLsuoZdho4bDxtGP9Xfm+p485ubuwoooruJCiiigAooooAKKKKACiiigAr2D4A/G7Vfh3dJpWp+dqPhqR8vb5zJaknl4s/mU6H2OSfH6K4cxy7DZjQlh8THmi/wCrrs/MqE3B3R+nvhXxDo/ibRbfWdC1CG+sZxlJYz+YI6hh3B5Fa6mvzb+F3xH8T/DvWPt2g3f7iQj7TZy5aG4A/vDsfRhgj6ZFfbHwe+MfhX4jWqQ2c4sNZVczabcOPMGOpQ9JF9xyO4FfgnE3BOLydurS9+j36r/Ev129Nj1KOJjU0ejPTwaerVXVs08Gvh3E6iwrU8NVYNTw1Q4gWA1ODVXDU4NUOIFgNShqgD0u6p5QuT7qN1Q7qN1LlHcm3Ubqh3UbqOULkpakLVFupC9PlFckLU0tUZamlqpRAkLUxmphamFqtRAezUwmmk0xmxVqIDmNZHirxDo/hnRbjWdd1CGxsYBl5ZD+QA6knsBya4r4w/GPwr8ObV4rycX+sMuYdNt3HmHPQueka+55PYGvij4o/EfxP8RNY+3a9d/uIyfs1lFkQ24P91e59WOSfpgV9xwzwTi84aq1fco9+r/wr9dvXY5a2JjT0WrOv+P3xu1X4iXL6Vpnnad4ajfKW5OJLkg8PLj8wnQe5wR4/RRX73l2XYbLqEcPho8sV/V33fmeXObm7sKKKK7iQooooAKKKKACiiigAooooAKKKKACiiigAqS1nntbmO5tZpIJ4mDxyRsVZGHQgjkH3qOik0mrMD6N+Ef7TuraSsOl+O4JNWs1wq6hCALmMf7Y4Eg9+G6/eNfU/g3xf4c8X6YNR8Oavbajb8bvKb5oyezqfmU+xAr8y60NA1rV9A1KPUtE1K6068j+7NbylGx6ZHUex4Nfn2e+HmBx7dXC/up+Xwv5dPl9x10sXKOktUfqGGFOBr46+Hf7VOuaeI7TxrpSatCMA3lpiKcD1Kfcc/TZX0N4E+LvgDxkI49H8RWy3b8Czuj5E+fQK2N3/AcivyXNuEs0ytt1qTcV9qOq/Db5pHdTxEJ7M9BBpQ1QB6cGFfN8ptcmDU4PUO6jNTyjJt1LvqHNGaXKBNvpN1RZozRygSl6aWqPNBanygPLUhNRlhTS9NRFckJppYVwXjr4ueAPBokj1jxFatdpkfZLU+fPn0Krnb/wLAr55+Iv7VOuagJLTwVpSaTCcgXl2BLOR6hPuKfrvr6XKeEs0zRp0aTUX9qWi/4PyTMaleEN2fUvjLxf4c8IaYdR8R6va6db87TK3zSEdkUfM59gCa+WPi5+07q2rCbS/AcEmk2ZyrahMAbmQf7A5EY9+W/3TXgOv61q+v6lJqWt6ldajeSfemuJS7Y9BnoPYcCs+v1rIvDzA4Bqriv3s/P4V8uvz+44auLlLSOiJLqee6uZLm6mknnlYvJJIxZnY9SSeSajoor9BSSVkcgUUUUwCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDtvB/xX+IXhQJHo/im/W3ThbedvPhA9Aj5C/hivW/DH7WXiG2Cx+IvDOn6gBwZLSZrdvqQd4J+mK+bqK8PH8NZVj23XoRb7pWf3qzNY1px2Z9s6D+1L8O74Kuo2+s6U/wDEZbcSIPoUYk/98iu20r41/C3UgDb+NdMjz/z8s1v/AOjAtfnhRXy2J8M8pqa05Tj801+Kv+JssZNbn6Z2XjXwhegGz8VaHcg9DFqET/yatKPV9NlGY9Rs3H+zMp/rX5dUV5c/Cqi37uJa/wC3U/8A25F/Xn2P1Fk1fTYhmTUbNB/tTKP61m3vjXwhZAm88VaFbAdTLqESfzavzMooh4VUU/exLf8A26l/7cw+vPsfofqvxr+Fumgm48a6ZJj/AJ9ma4/9Fhq4nXv2pfh3Yhl0631nVX/hMVuI0P1LsCP++TXxNRXqYbwzyqm71JTl80l+Cv8AiQ8ZN7H0j4m/ay8Q3IaPw74Y0/T1PAku5muG+oC7AD9c15J4v+LHxD8Vh49Y8U37W78G3t2EERHoVjwG/HNcTRX1OA4ayrANOhQimurV397uzGVact2FFFFe4ZBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH/2Q";
        var testJson = JSON.stringify({ quote: "{{test-quote}}" });
        var testXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><root><author>{{author}}</author><quote>{{quote}}</quote></root>";
        var testNameValuePairs = [{ name: 'foo1', value: 'bar1' }, { name: 'foo2', value: 'bar2' }];
        var stripWhite = function (s) { return s.replaceAll(/\s/g, ''); };
        it('are consistent from binary, text and back', function () { return __awaiter(void 0, void 0, void 0, function () {
            var asText, asBinary;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (new body_conversion_1.BodyConversion({
                            type: lib_typescript_1.BodyType.Raw,
                            data: testBase64
                        })).toText()];
                    case 1:
                        asText = _a.sent();
                        return [4 /*yield*/, (new body_conversion_1.BodyConversion(asText)).toRaw()];
                    case 2:
                        asBinary = _a.sent();
                        expect(asBinary.data).toEqual(testBase64);
                        return [2 /*return*/];
                }
            });
        }); });
        it('are consistent from JSON, text and back', function () { return __awaiter(void 0, void 0, void 0, function () {
            var asText, asJson;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (new body_conversion_1.BodyConversion({
                            type: lib_typescript_1.BodyType.JSON,
                            data: testJson
                        })).toText()];
                    case 1:
                        asText = _a.sent();
                        return [4 /*yield*/, (new body_conversion_1.BodyConversion(asText)).toJson()];
                    case 2:
                        asJson = _a.sent();
                        expect(stripWhite(asJson.data)).toEqual(stripWhite(testJson));
                        return [2 /*return*/];
                }
            });
        }); });
        it('are consistent from JSON, XML and back', function () { return __awaiter(void 0, void 0, void 0, function () {
            var asXML, asJson;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (new body_conversion_1.BodyConversion({
                            type: lib_typescript_1.BodyType.JSON,
                            data: testJson
                        })).toXML()];
                    case 1:
                        asXML = _a.sent();
                        return [4 /*yield*/, (new body_conversion_1.BodyConversion(asXML)).toJson()];
                    case 2:
                        asJson = _a.sent();
                        expect(stripWhite(asJson.data)).toEqual(stripWhite(testJson));
                        return [2 /*return*/];
                }
            });
        }); });
        it('are consistent from XML, text and back', function () { return __awaiter(void 0, void 0, void 0, function () {
            var asText, asXml;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (new body_conversion_1.BodyConversion({
                            type: lib_typescript_1.BodyType.XML,
                            data: testXml
                        })).toText()];
                    case 1:
                        asText = _a.sent();
                        return [4 /*yield*/, (new body_conversion_1.BodyConversion(asText)).toXML()];
                    case 2:
                        asXml = _a.sent();
                        expect(stripWhite(asXml.data)).toEqual(stripWhite(testXml));
                        return [2 /*return*/];
                }
            });
        }); });
        it('are consistent from JSON, XML, text and back', function () { return __awaiter(void 0, void 0, void 0, function () {
            var asXml, asText, asJson;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (new body_conversion_1.BodyConversion({
                            type: lib_typescript_1.BodyType.JSON,
                            data: testJson
                        })).toXML()];
                    case 1:
                        asXml = _a.sent();
                        return [4 /*yield*/, (new body_conversion_1.BodyConversion(asXml)).toText()];
                    case 2:
                        asText = _a.sent();
                        return [4 /*yield*/, (new body_conversion_1.BodyConversion(asText)).toJson()];
                    case 3:
                        asJson = _a.sent();
                        expect(stripWhite(asJson.data)).toEqual(stripWhite(testJson));
                        return [2 /*return*/];
                }
            });
        }); });
        it('are consistent between form, text and back', function () { return __awaiter(void 0, void 0, void 0, function () {
            var asText, asForm;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (new body_conversion_1.BodyConversion({
                            type: lib_typescript_1.BodyType.Form,
                            data: testNameValuePairs
                        })).toText()];
                    case 1:
                        asText = _a.sent();
                        return [4 /*yield*/, (new body_conversion_1.BodyConversion(asText)).toForm()
                            // Compare without IDs
                        ];
                    case 2:
                        asForm = _a.sent();
                        // Compare without IDs
                        expect(asForm.data.map(function (d) { return ({ name: d.name, value: d.value }); })).toEqual(testNameValuePairs);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('parseText', function () {
        it('should return undefined for empty string', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, body_conversion_1.BodyConversion['parseText']('')];
                    case 1:
                        result = _a.sent();
                        expect(result).toBeUndefined();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return undefined for null', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](null)];
                    case 1:
                        result = _a.sent();
                        expect(result).toBeUndefined();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return undefined for undefined', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](undefined)];
                    case 1:
                        result = _a.sent();
                        expect(result).toBeUndefined();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse valid JSON', function () { return __awaiter(void 0, void 0, void 0, function () {
            var json, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        json = '{"name": "John", "age": 30}';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](json)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual({ name: 'John', age: 30 });
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse valid JSON array', function () { return __awaiter(void 0, void 0, void 0, function () {
            var json, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        json = '[1, 2, 3]';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](json)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual([1, 2, 3]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse valid XML', function () { return __awaiter(void 0, void 0, void 0, function () {
            var xml, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        xml = '<root><name>John</name></root>';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](xml)];
                    case 1:
                        result = _a.sent();
                        expect(result).toHaveProperty('name');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse name-value pairs separated by commas', function () { return __awaiter(void 0, void 0, void 0, function () {
            var pairs, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pairs = 'key1=value1,key2=value2,key3=value3';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](pairs)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual([
                            { name: 'key1', value: 'value1' },
                            { name: 'key2', value: 'value2' },
                            { name: 'key3', value: 'value3' }
                        ]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle escaped commas in name-value pairs', function () { return __awaiter(void 0, void 0, void 0, function () {
            var pairs, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pairs = 'key1=value1\\,a,key2=value2';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](pairs)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual([
                            { name: 'key1', value: 'value1,a' },
                            { name: 'key2', value: 'value2' },
                        ]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse plain text as a string', function () { return __awaiter(void 0, void 0, void 0, function () {
            var text, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        text = 'plain text that is not JSON or XML';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](text)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual(text);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse text with commas without equals as a string', function () { return __awaiter(void 0, void 0, void 0, function () {
            var text, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        text = 'plain text, with commas, gets parsed';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](text)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual(text);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse text with commas with equals as name value pairs', function () { return __awaiter(void 0, void 0, void 0, function () {
            var text, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        text = 'abc=123, def=456';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](text)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual([
                            { name: 'abc', value: '123' },
                            { name: 'def', value: '456' },
                        ]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse text with commas with escaped equals as name value pairs', function () { return __awaiter(void 0, void 0, void 0, function () {
            var text, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        text = 'abc\\==123, def=456\\=';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](text)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual([
                            { name: 'abc=', value: '123' },
                            { name: 'def', value: '456=' },
                        ]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse text with commas with escaped commas as name value pairs', function () { return __awaiter(void 0, void 0, void 0, function () {
            var text, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        text = 'abc\\,=123, def=456\\,';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](text)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual([
                            { name: 'abc,', value: '123' },
                            { name: 'def', value: '456,' },
                        ]);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return Base64 when there is valid Base64 when checkBase64 is true', function () { return __awaiter(void 0, void 0, void 0, function () {
            var base64Text, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        base64Text = 'SGVsbG8gV29ybGQ=';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](base64Text, true)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual(base64Text);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should decode Base64 JSON and parse it', function () { return __awaiter(void 0, void 0, void 0, function () {
            var base64Json, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        base64Json = 'eyJuYW1lIjogIkpvaG4iLCAiYWdlIjogMzB9';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](base64Json, true)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual({ name: 'John', age: 30 });
                        return [2 /*return*/];
                }
            });
        }); });
        it('should decode Base64 XML and parse it', function () { return __awaiter(void 0, void 0, void 0, function () {
            var base64Xml, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        base64Xml = 'PHJvb3Q+PG5hbWU+VGVzdDwvbmFtZT48L3Jvb3Q+';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](base64Xml, true)];
                    case 1:
                        result = _a.sent();
                        expect(result).toHaveProperty('name');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should use checkBase64=true by default', function () { return __awaiter(void 0, void 0, void 0, function () {
            var base64Json, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        base64Json = 'eyJ0ZXN0IjogInZhbHVlIn0=';
                        return [4 /*yield*/, body_conversion_1.BodyConversion['parseText'](base64Json)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual({ test: 'value' });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('isValidBase64', function () {
        it('should return true for valid Base64 strings', function () {
            expect(body_conversion_1.BodyConversion['isValidBase64']('SGVsbG8gV29ybGQ=')).toBe(true);
            expect(body_conversion_1.BodyConversion['isValidBase64']('VGVzdA==')).toBe(true);
            expect(body_conversion_1.BodyConversion['isValidBase64']('YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=')).toBe(true);
        });
        it('should return false for invalid Base64 strings', function () {
            expect(body_conversion_1.BodyConversion['isValidBase64']('Invalid@Base64')).toBe(false);
            expect(body_conversion_1.BodyConversion['isValidBase64']('Hello World')).toBe(false);
            expect(body_conversion_1.BodyConversion['isValidBase64']('123')).toBe(false);
        });
        it('should return false for empty or null strings', function () {
            expect(body_conversion_1.BodyConversion['isValidBase64']('')).toBe(false);
            expect(body_conversion_1.BodyConversion['isValidBase64'](null)).toBe(false);
            expect(body_conversion_1.BodyConversion['isValidBase64'](undefined)).toBe(false);
        });
        it('should return false for strings with incorrect length', function () {
            expect(body_conversion_1.BodyConversion['isValidBase64']('SGVsb')).toBe(false);
        });
        it('should return false for strings with too much padding', function () {
            expect(body_conversion_1.BodyConversion['isValidBase64']('SGVsbG8===')).toBe(false);
        });
        it('should return true for image data', function () {
            var testBase64 = "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";
            expect(body_conversion_1.BodyConversion['isValidBase64'](testBase64)).toBe(true);
        });
    });
    describe('toXML', function () {
        it('should return source when body type is already XML', function () { return __awaiter(void 0, void 0, void 0, function () {
            var xmlBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        xmlBody = {
                            type: lib_typescript_1.BodyType.XML,
                            data: '<root><item>value</item></root>'
                        };
                        converter = new body_conversion_1.BodyConversion(xmlBody);
                        return [4 /*yield*/, converter.toXML()];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual(xmlBody);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert JSON body to XML', function () { return __awaiter(void 0, void 0, void 0, function () {
            var jsonBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        jsonBody = {
                            type: lib_typescript_1.BodyType.JSON,
                            data: '{"root": {"item": "value"}}'
                        };
                        converter = new body_conversion_1.BodyConversion(jsonBody);
                        return [4 /*yield*/, converter.toXML()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.XML);
                        expect(result.data).toContain('<root>');
                        expect(result.data).toContain('<item>value</item>');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert Text body to XML', function () { return __awaiter(void 0, void 0, void 0, function () {
            var textBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        textBody = {
                            type: lib_typescript_1.BodyType.Text,
                            data: '{"root": {"item": "value"}}'
                        };
                        converter = new body_conversion_1.BodyConversion(textBody);
                        return [4 /*yield*/, converter.toXML()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.XML);
                        expect(typeof result.data).toBe('string');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert Form body to XML', function () { return __awaiter(void 0, void 0, void 0, function () {
            var formBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        formBody = {
                            type: lib_typescript_1.BodyType.Form,
                            data: [
                                { name: 'key1', value: 'value1' },
                                { name: 'key2', value: 'value2' }
                            ]
                        };
                        converter = new body_conversion_1.BodyConversion(formBody);
                        return [4 /*yield*/, converter.toXML()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.XML);
                        expect(typeof result.data).toBe('string');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert Raw body to XML', function () { return __awaiter(void 0, void 0, void 0, function () {
            var rawBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        rawBody = {
                            type: lib_typescript_1.BodyType.Raw,
                            data: 'raw data content'
                        };
                        converter = new body_conversion_1.BodyConversion(rawBody);
                        return [4 /*yield*/, converter.toXML()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.XML);
                        expect(typeof result.data).toBe('string');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return empty string for None body type', function () { return __awaiter(void 0, void 0, void 0, function () {
            var noneBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        noneBody = {
                            type: lib_typescript_1.BodyType.None,
                            data: undefined
                        };
                        converter = new body_conversion_1.BodyConversion(noneBody);
                        return [4 /*yield*/, converter.toXML()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.XML);
                        expect(result.data).toBe('');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle complex nested JSON to XML conversion', function () { return __awaiter(void 0, void 0, void 0, function () {
            var jsonBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        jsonBody = {
                            type: lib_typescript_1.BodyType.JSON,
                            data: '{"root": {"child1": {"name": "value1"}, "child2": {"name": "value2"}}}'
                        };
                        converter = new body_conversion_1.BodyConversion(jsonBody);
                        return [4 /*yield*/, converter.toXML()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.XML);
                        expect(result.data).toContain('<root>');
                        expect(result.data).toContain('<child1>');
                        expect(result.data).toContain('<child2>');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('toText', function () {
        it('should return source when body type is already Text', function () { return __awaiter(void 0, void 0, void 0, function () {
            var textBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        textBody = {
                            type: lib_typescript_1.BodyType.Text,
                            data: 'plain text content'
                        };
                        converter = new body_conversion_1.BodyConversion(textBody);
                        return [4 /*yield*/, converter.toText()];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual(textBody);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert JSON body to Text', function () { return __awaiter(void 0, void 0, void 0, function () {
            var jsonBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        jsonBody = {
                            type: lib_typescript_1.BodyType.JSON,
                            data: '{"name": "John", "age": 30}'
                        };
                        converter = new body_conversion_1.BodyConversion(jsonBody);
                        return [4 /*yield*/, converter.toText()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Text);
                        expect(result.data).toBe('{"name": "John", "age": 30}');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert XML body to Text', function () { return __awaiter(void 0, void 0, void 0, function () {
            var xmlBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        xmlBody = {
                            type: lib_typescript_1.BodyType.XML,
                            data: '<root><item>value</item></root>'
                        };
                        converter = new body_conversion_1.BodyConversion(xmlBody);
                        return [4 /*yield*/, converter.toText()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Text);
                        expect(result.data).toBe('<root><item>value</item></root>');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert Raw body to Text', function () { return __awaiter(void 0, void 0, void 0, function () {
            var rawBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        rawBody = {
                            type: lib_typescript_1.BodyType.Raw,
                            data: 'raw data content'
                        };
                        converter = new body_conversion_1.BodyConversion(rawBody);
                        return [4 /*yield*/, converter.toText()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Text);
                        expect(result.data).toBe('raw data content');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert Form body to Text with comma-separated name-value pairs', function () { return __awaiter(void 0, void 0, void 0, function () {
            var formBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        formBody = {
                            type: lib_typescript_1.BodyType.Form,
                            data: [
                                { name: 'key1', value: 'value1' },
                                { name: 'key2', value: 'value2' },
                                { name: 'key3', value: 'value3' }
                            ]
                        };
                        converter = new body_conversion_1.BodyConversion(formBody);
                        return [4 /*yield*/, converter.toText()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Text);
                        expect(result.data).toBe('key1=value1, key2=value2, key3=value3');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should escape first comma in Form field names and values', function () { return __awaiter(void 0, void 0, void 0, function () {
            var formBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        formBody = {
                            type: lib_typescript_1.BodyType.Form,
                            data: [
                                { name: 'key,with,comma', value: 'value,with,comma' },
                                { name: 'key2', value: 'value2' }
                            ]
                        };
                        converter = new body_conversion_1.BodyConversion(formBody);
                        return [4 /*yield*/, converter.toText()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Text);
                        // Note: replace() only replaces first occurrence, so only first comma is escaped
                        expect(result.data).toContain('key\\,with,comma=value\\,with,comma');
                        expect(result.data).toContain('key2=value2');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return empty string for None body type', function () { return __awaiter(void 0, void 0, void 0, function () {
            var noneBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        noneBody = {
                            type: lib_typescript_1.BodyType.None,
                            data: undefined
                        };
                        converter = new body_conversion_1.BodyConversion(noneBody);
                        return [4 /*yield*/, converter.toText()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Text);
                        expect(result.data).toBe('');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle Form body with single name-value pair', function () { return __awaiter(void 0, void 0, void 0, function () {
            var formBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        formBody = {
                            type: lib_typescript_1.BodyType.Form,
                            data: [
                                { name: 'singleKey', value: 'singleValue' }
                            ]
                        };
                        converter = new body_conversion_1.BodyConversion(formBody);
                        return [4 /*yield*/, converter.toText()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Text);
                        expect(result.data).toBe('singleKey=singleValue');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle empty Form body', function () { return __awaiter(void 0, void 0, void 0, function () {
            var formBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        formBody = {
                            type: lib_typescript_1.BodyType.Form,
                            data: []
                        };
                        converter = new body_conversion_1.BodyConversion(formBody);
                        return [4 /*yield*/, converter.toText()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Text);
                        expect(result.data).toBe('');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('toRaw', function () {
        it('should return source when body type is already Raw', function () { return __awaiter(void 0, void 0, void 0, function () {
            var rawBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        rawBody = {
                            type: lib_typescript_1.BodyType.Raw,
                            data: 'SGVsbG8gV29ybGQ='
                        };
                        converter = new body_conversion_1.BodyConversion(rawBody);
                        return [4 /*yield*/, converter.toRaw()];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual(rawBody);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert Text body to Base64-encoded Raw', function () { return __awaiter(void 0, void 0, void 0, function () {
            var textBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        textBody = {
                            type: lib_typescript_1.BodyType.Text,
                            data: 'Hello World'
                        };
                        converter = new body_conversion_1.BodyConversion(textBody);
                        return [4 /*yield*/, converter.toRaw()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Raw);
                        expect(result.data).toBe('SGVsbG8gV29ybGQ=');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert JSON body to Base64-encoded Raw', function () { return __awaiter(void 0, void 0, void 0, function () {
            var jsonBody, converter, result, decoded;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        jsonBody = {
                            type: lib_typescript_1.BodyType.JSON,
                            data: '{"name":"test"}'
                        };
                        converter = new body_conversion_1.BodyConversion(jsonBody);
                        return [4 /*yield*/, converter.toRaw()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Raw);
                        expect(result.data).toBeTruthy();
                        expect(result.data.length % 4).toBe(0);
                        decoded = atob(result.data);
                        expect(decoded).toBe('{"name":"test"}');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert XML body to Base64-encoded Raw', function () { return __awaiter(void 0, void 0, void 0, function () {
            var xmlBody, converter, result, decoded;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        xmlBody = {
                            type: lib_typescript_1.BodyType.XML,
                            data: '<root><item>value</item></root>'
                        };
                        converter = new body_conversion_1.BodyConversion(xmlBody);
                        return [4 /*yield*/, converter.toRaw()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Raw);
                        expect(result.data).toBeTruthy();
                        decoded = atob(result.data);
                        expect(decoded).toBe('<root><item>value</item></root>');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should convert Form body to Base64-encoded JSON Raw', function () { return __awaiter(void 0, void 0, void 0, function () {
            var formBody, converter, result, decoded, parsed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        formBody = {
                            type: lib_typescript_1.BodyType.Form,
                            data: [
                                { name: 'key1', value: 'value1' },
                                { name: 'key2', value: 'value2' }
                            ]
                        };
                        converter = new body_conversion_1.BodyConversion(formBody);
                        return [4 /*yield*/, converter.toRaw()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Raw);
                        expect(result.data).toBeTruthy();
                        decoded = atob(result.data);
                        parsed = JSON.parse(decoded);
                        expect(Array.isArray(parsed)).toBe(true);
                        expect(parsed).toHaveLength(2);
                        expect(parsed[0]).toHaveProperty('name', 'key1');
                        expect(parsed[0]).toHaveProperty('value', 'value1');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return empty string for None body type', function () { return __awaiter(void 0, void 0, void 0, function () {
            var noneBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        noneBody = {
                            type: lib_typescript_1.BodyType.None,
                            data: undefined
                        };
                        converter = new body_conversion_1.BodyConversion(noneBody);
                        return [4 /*yield*/, converter.toRaw()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Raw);
                        expect(result.data).toBe('');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle UTF-8 characters correctly', function () { return __awaiter(void 0, void 0, void 0, function () {
            var textBody, converter, result, decoder, decoded, bytes, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        textBody = {
                            type: lib_typescript_1.BodyType.Text,
                            data: 'Hello 世界 🌍'
                        };
                        converter = new body_conversion_1.BodyConversion(textBody);
                        return [4 /*yield*/, converter.toRaw()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Raw);
                        expect(result.data).toBeTruthy();
                        decoder = new TextDecoder();
                        decoded = atob(result.data);
                        bytes = new Uint8Array(decoded.length);
                        for (i = 0; i < decoded.length; i++) {
                            bytes[i] = decoded.charCodeAt(i);
                        }
                        expect(decoder.decode(bytes)).toBe('Hello 世界 🌍');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle empty Text body', function () { return __awaiter(void 0, void 0, void 0, function () {
            var textBody, converter, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        textBody = {
                            type: lib_typescript_1.BodyType.Text,
                            data: ''
                        };
                        converter = new body_conversion_1.BodyConversion(textBody);
                        return [4 /*yield*/, converter.toRaw()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Raw);
                        expect(result.data).toBe('');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle empty Form body', function () { return __awaiter(void 0, void 0, void 0, function () {
            var formBody, converter, result, decoded;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        formBody = {
                            type: lib_typescript_1.BodyType.Form,
                            data: []
                        };
                        converter = new body_conversion_1.BodyConversion(formBody);
                        return [4 /*yield*/, converter.toRaw()];
                    case 1:
                        result = _a.sent();
                        expect(result.type).toBe(lib_typescript_1.BodyType.Raw);
                        decoded = atob(result.data);
                        expect(JSON.parse(decoded)).toEqual([]);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
